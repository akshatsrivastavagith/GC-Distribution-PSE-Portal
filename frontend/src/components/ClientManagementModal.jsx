import { API_BASE_URL, WS_URL } from "../config/api"
import { useState, useEffect } from 'react'

export default function ClientManagementModal({ isOpen, onClose, onSave }) {
  const [clients, setClients] = useState([])
  const [editingIndex, setEditingIndex] = useState(null)
  const [editName, setEditName] = useState('')
  const [editOfferId, setEditOfferId] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadClients()
    }
  }, [isOpen])

  const loadClients = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const res = await fetch(`${API_BASE_URL}/config/clients`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await res.json()
      setClients(data || [])
    } catch (error) {
      console.error('Error loading clients:', error)
    }
  }

  const handleEdit = (index) => {
    setEditingIndex(index)
    setEditName(clients[index].name)
    setEditOfferId(clients[index].offer_id)
  }

  const handleSave = (index) => {
    const updated = [...clients]
    updated[index] = {
      name: editName,
      offer_id: editOfferId
    }
    setClients(updated)
    setEditingIndex(null)
    setEditName('')
    setEditOfferId('')
  }

  const handleDelete = (index) => {
    if (confirm(`Are you sure you want to delete ${clients[index].name}?`)) {
      const updated = clients.filter((_, i) => i !== index)
      setClients(updated)
    }
  }

  const handleAddNew = () => {
    setIsAdding(true)
    setEditName('')
    setEditOfferId('')
  }

  const handleSaveNew = () => {
    if (!editName.trim() || !editOfferId.trim()) {
      alert('Please enter both client name and offer ID')
      return
    }
    setClients([...clients, { name: editName, offer_id: editOfferId }])
    setIsAdding(false)
    setEditName('')
    setEditOfferId('')
  }

  const handleSaveAll = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const res = await fetch(`${API_BASE_URL}/config/clients`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(clients)
      })
      
      if (res.ok) {
        alert('Clients updated successfully')
        onSave(clients)
        onClose()
      } else {
        alert('Failed to save clients')
      }
    } catch (error) {
      console.error('Error saving clients:', error)
      alert('Error saving clients')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">Manage Clients</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-6">
          <table className="min-w-full border-collapse border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Client Name</th>
                <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Offer ID</th>
                <th className="border border-gray-300 px-4 py-2 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client, index) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  {editingIndex === index ? (
                    <>
                      <td className="border border-gray-300 px-4 py-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="border border-gray-300 px-4 py-2">
                        <input
                          type="text"
                          value={editOfferId}
                          onChange={(e) => setEditOfferId(e.target.value)}
                          className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center space-x-2">
                        <button
                          onClick={() => handleSave(index)}
                          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingIndex(null)}
                          className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition text-sm"
                        >
                          Cancel
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="border border-gray-300 px-4 py-2">{client.name}</td>
                      <td className="border border-gray-300 px-4 py-2 font-mono text-sm">{client.offer_id}</td>
                      <td className="border border-gray-300 px-4 py-2 text-center space-x-2">
                        <button
                          onClick={() => handleEdit(index)}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(index)}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm"
                        >
                          Delete
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              
              {/* Add New Row */}
              {isAdding && (
                <tr className="bg-blue-50">
                  <td className="border border-gray-300 px-4 py-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Client Name"
                      className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    <input
                      type="text"
                      value={editOfferId}
                      onChange={(e) => setEditOfferId(e.target.value)}
                      placeholder="Offer ID"
                      className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-center space-x-2">
                    <button
                      onClick={handleSaveNew}
                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setIsAdding(false)}
                      className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition text-sm"
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {!isAdding && (
            <button
              onClick={handleAddNew}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            >
              Add New Client
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t space-x-3">
          <button
            onClick={handleSaveAll}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
          >
            Save All Changes
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

