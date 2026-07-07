import { useState, useEffect, useRef, useCallback } from 'react'

const API_URL = 'http://localhost:5000/api/tasks'
const TASKS_PER_PAGE = 10

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
  const [hasMore, setHasMore] = useState(true)
  const [skip, setSkip] = useState(0)

  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')

  const bottomOfListRef = useRef<HTMLDivElement | null>(null)

  const loadTasks = useCallback(async (skipAmount: number) => {
    setLoading(true)

    try {
      const response = await fetch(`${API_URL}?skip=${skipAmount}&limit=${TASKS_PER_PAGE}`)
      const result: TasksResponse = await response.json()

      if (skipAmount === 0) {
        setTasks(result.data)
      } else {
        setTasks((existingTasks) => [...existingTasks, ...result.data])
      }

      setHasMore(result.hasMore)
    } catch (error) {
      console.error('Could not load tasks:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTasks(0)
  }, [loadTasks])

  useEffect(() => {
    if (skip > 0) {
      loadTasks(skip)
    }
  }, [skip, loadTasks])

  useEffect(() => {
    if (loading || !hasMore) return

    const observer = new IntersectionObserver((entries) => {
      const bottomIsVisible = entries[0].isIntersecting
      if (bottomIsVisible) {
        setSkip((currentSkip) => currentSkip + TASKS_PER_PAGE)
      }
    })

    if (bottomOfListRef.current) {
      observer.observe(bottomOfListRef.current)
    }

    return () => observer.disconnect()
  }, [loading, hasMore])

  // Function for adding task
  const handleAddTask = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!newTitle.trim()) return

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: newTitle,
        description: newDescription || null,
      }),
    })

    const createdTask: Task = await response.json()

    setTasks((existingTasks) => [createdTask, ...existingTasks])
    setNewTitle('')
    setNewDescription('')
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
    setTasks((existingTasks) => existingTasks.filter((task) => task.uuid !== taskUuid))
    await fetch(`${API_URL}/${taskUuid}`, { method: 'DELETE' })
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

      {loading && <p className="text-center text-gray-500 py-3">Loading...</p>}
      {!hasMore && tasks.length > 0 && (
        <p className="text-center text-gray-500 py-3">No more tasks</p>
      )}

      <div ref={bottomOfListRef} className="h-px" />
    </section>
  )
}

export default App
