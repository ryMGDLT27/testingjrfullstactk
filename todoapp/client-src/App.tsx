import { useState, useEffect, useCallback } from 'react'

const API_URL = 'http://localhost:5000/api/tasks'
const TASKS_PER_PAGE = 5

interface Task {
  uuid: string
  title: string
  description: string | null
  completed: boolean
  createdAt: string
  updatedAt: string
}

interface TasksResponse {
  data: Task[]
  skip: number
  limit: number
  total: number
  hasMore: boolean
}

function App() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)

  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')

  const totalPages = Math.ceil(total / TASKS_PER_PAGE)

  const loadTasks = useCallback(async (page: number) => {
    setLoading(true)

    try {
      const skip = (page - 1) * TASKS_PER_PAGE
      const response = await fetch(`${API_URL}?skip=${skip}&limit=${TASKS_PER_PAGE}`)
      const result: TasksResponse = await response.json()

      setTasks(result.data)
      setTotal(result.total)
    } catch (error) {
      console.error('Could not load tasks:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTasks(currentPage)
  }, [currentPage, loadTasks])

  // Function for adding task
  const handleAddTask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!newTitle.trim()) return

    await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTitle,
        description: newDescription || null,
      }),
    })

    setNewTitle('')
    setNewDescription('')
    loadTasks(1)
    setCurrentPage(1)
  }

  const handleToggleComplete = async (taskUuid: string, currentlyCompleted: boolean) => {
    setTasks((existingTasks) =>
      existingTasks.map((task) =>
        task.uuid === taskUuid
          ? { ...task, completed: !currentlyCompleted }
          : task
      )
    )

    await fetch(`${API_URL}/${taskUuid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !currentlyCompleted }),
    })
  }

  const startEditingTask = (task: Task) => {
    setEditingTaskId(task.uuid)
    setEditTitle(task.title)
    setEditDescription(task.description || '')
  }

  const cancelEditingTask = () => {
    setEditingTaskId(null)
    setEditTitle('')
    setEditDescription('')
  }

  const saveEditedTask = async (taskUuid: string) => {
    if (!editTitle.trim()) {
      cancelEditingTask()
      return
    }

    setTasks((existingTasks) =>
      existingTasks.map((task) =>
        task.uuid === taskUuid
          ? { ...task, title: editTitle, description: editDescription }
          : task
      )
    )

    await fetch(`${API_URL}/${taskUuid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: editTitle,
        description: editDescription || null,
      }),
    })

    cancelEditingTask()
  }

  const handleDeleteTask = async (taskUuid: string) => {
    await fetch(`${API_URL}/${taskUuid}`, { method: 'DELETE' })
    const page = tasks.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage
    setCurrentPage(page)
    loadTasks(page)
  }

  return (
    <section className="max-w-md mx-auto min-h-screen px-4 py-6 bg-zinc-100">
      <h1 className="text-2xl font-bold text-center mb-4 text-indigo-600">
        Todo App
      </h1>

      <form onSubmit={handleAddTask} className="flex flex-col gap-2 mb-4">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Task title"
          className="px-3 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <textarea
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          placeholder="Description (optional)"
          rows={2}
          className="px-3 py-2 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
        <button
          type="submit"
          className="px-4 py-3 rounded-lg bg-indigo-600 text-white font-medium hover:bg-indigo-700 active:bg-indigo-800 transition"
        >
          Add Task
        </button>
      </form>

      <ul className="flex flex-col gap-2">
        {tasks.map((task) => (
          <li key={task.uuid} className="flex flex-col gap-2 bg-white rounded-lg p-3 shadow-sm">
            {editingTaskId === task.uuid ? (
              <div className="flex flex-col gap-2">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  autoFocus
                  className="px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => saveEditedTask(task.uuid)}
                    className="px-3 py-2 text-sm rounded-md bg-green-600 text-white hover:bg-green-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={cancelEditingTask}
                    className="px-3 py-2 text-sm rounded-md bg-gray-400 text-white hover:bg-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div
                  onClick={() => handleToggleComplete(task.uuid, task.completed)}
                  className="flex-1 cursor-pointer min-w-[150px]"
                >
                  <p className={`break-words font-medium ${task.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                    {task.title}
                  </p>
                  {task.description && (
                    <p className={`text-sm break-words ${task.completed ? 'line-through text-gray-300' : 'text-gray-500'}`}>
                      {task.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => startEditingTask(task)}
                    className="px-3 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteTask(task.uuid)}
                    className="px-3 py-2 text-sm rounded-md bg-red-500 text-white hover:bg-red-600"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-center gap-3 py-4">
        <button
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          disabled={currentPage === 1 || loading}
          className="px-3 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        {loading ? (
          <span className="text-sm text-gray-500">Loading...</span>
        ) : (
          <span className="text-sm text-gray-700">
            Page {currentPage} of {totalPages || 1}
          </span>
        )}
        <button
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages || totalPages === 0 || loading}
          className="px-3 py-2 text-sm rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </section>
  )
}

export default App
