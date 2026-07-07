import express from 'express'
import cors from 'cors'
import { v4 as uuidv4 } from 'uuid'
import type { RowDataPacket, ResultSetHeader } from 'mysql2/promise'
import pool from './db.js'

interface Task extends RowDataPacket {
  uuid: string
  title: string
  description: string | null
  completed: boolean
  createdAt: string
  updatedAt: string
}

interface CountResult extends RowDataPacket {
  total: number
}

interface TaskBody {
  title?: string
  description?: string | null
  completed?: boolean
}

const app = express()
app.use(cors())
app.use(express.json())

app.get('/api/tasks', async (req, res) => {
  const skip = parseInt(req.query.skip as string) || 0
  const limit = parseInt(req.query.limit as string) || 10

  try {
    const [rows] = await pool.query<Task[]>(
      'SELECT * FROM tasks ORDER BY createdAt DESC LIMIT ? OFFSET ?',
      [limit, skip]
    )
    const [[{ total }]] = await pool.query<CountResult[]>('SELECT COUNT(*) as total FROM tasks')

    res.json({
      data: rows,
      skip,
      limit,
      total,
      hasMore: skip + rows.length < total,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to fetch tasks' })
  }
})

app.post('/api/tasks', async (req, res) => {
  const { title, description } = req.body as TaskBody

  if (!title?.trim()) {
    res.status(400).json({ error: 'Title is required' })
    return
  }

  try {
    const uuid = uuidv4()
    await pool.query(
      'INSERT INTO tasks (uuid, title, description) VALUES (?, ?, ?)',
      [uuid, title, description || null]
    )
    const [[task]] = await pool.query<Task[]>('SELECT * FROM tasks WHERE uuid = ?', [uuid])
    res.status(201).json(task)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to create task' })
  }
})

app.put('/api/tasks/:uuid', async (req, res) => {
  const { uuid } = req.params
  const { title, description, completed } = req.body as TaskBody

  try {
    await pool.query(
      `UPDATE tasks 
       SET title = COALESCE(?, title), 
           description = COALESCE(?, description), 
           completed = COALESCE(?, completed) 
       WHERE uuid = ?`,
      [title ?? null, description ?? null, completed ?? null, uuid]
    )

    const [[task]] = await pool.query<Task[]>('SELECT * FROM tasks WHERE uuid = ?', [uuid])
    if (!task) {
      res.status(404).json({ error: 'Task not found' })
      return
    }
    res.json(task)
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to update task' })
  }
})

app.delete('/api/tasks/:uuid', async (req, res) => {
  const { uuid } = req.params

  try {
    const [result] = await pool.query<ResultSetHeader>('DELETE FROM tasks WHERE uuid = ?', [uuid])
    if (result.affectedRows === 0) {
      res.status(404).json({ error: 'Task not found' })
      return
    }
    res.json({ success: true })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Failed to delete task' })
  }
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
