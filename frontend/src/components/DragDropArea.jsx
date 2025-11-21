import React, { useState } from 'react'

export default function DragDropArea({ onFile }){
  const [isDragging, setIsDragging] = useState(false)

  const handleDragEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    const files = e.dataTransfer?.files
    if (files && files.length > 0) {
      onFile(files[0])
    }
  }

  const handleFileSelect = (e) => {
    const files = e.target.files
    if (files && files.length > 0) {
      onFile(files[0])
    }
  }

  return (
    <div 
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`border-2 border-dashed p-8 rounded-lg text-center transition-all ${
        isDragging 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-300 bg-gray-50 hover:border-gray-400'
      }`}
    >
      <div className="space-y-3">
        <div className="text-4xl">📁</div>
        <p className="text-gray-700 font-medium">
          {isDragging ? 'Drop file here!' : 'Drag & drop CSV file here'}
        </p>
        <p className="text-sm text-gray-500">or</p>
        <label className="inline-block">
          <input 
            type="file" 
            accept=".csv,.xlsx" 
            onChange={handleFileSelect} 
            className="hidden"
            id="fileInput"
          />
          <span className="cursor-pointer inline-block px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 font-medium">
            Choose File
          </span>
        </label>
        <p className="text-xs text-gray-400 mt-2">Supported: CSV, XLSX</p>
      </div>
    </div>
  )
}
