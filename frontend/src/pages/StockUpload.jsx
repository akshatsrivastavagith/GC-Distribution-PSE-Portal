import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import DragDropArea from '../components/DragDropArea'
import PreRunModal from '../components/PreRunModal'
import Terminal from '../components/Terminal'
import socket from '../lib/socket'
import * as XLSX from 'xlsx'
import { useEnvironment } from '../contexts/EnvironmentContext'
import { useAuth } from '../contexts/AuthContext'

export default function StockUpload(){
  const { isEnvSelected, getEnvLabel, environment } = useEnvironment()
  const { user } = useAuth()
  const [file,setFile] = useState(null)
  const [password,setPassword] = useState('')
  const [clientList,setClientList] = useState([])
  const [selectedClient,setSelectedClient] = useState(null)
  const [amountType,setAmountType] = useState('rupee')
  const [rzpCommission,setRzpCommission] = useState('')
  const [analysis,setAnalysis] = useState(null)
  const [showModal,setShowModal] = useState(false)
  const [runId,setRunId] = useState(null)
  const [lines,setLines] = useState([])
  const [showPreview,setShowPreview] = useState(false)
  const [csvData,setCsvData] = useState([])

  useEffect(()=>{
    fetch('http://localhost:5001/config/clients.json')
      .then(r=>r.json())
      .then(data=>{
        console.log('Clients loaded:', data)
        setClientList(data || [])
      })
      .catch(err=>console.error('Error loading clients:', err))
  },[])

  useEffect(()=>{
    if(!runId) return
    socket.on(`run_log:${runId}`, ({line}) => setLines(prev=>[...prev, line]))
    socket.on(`run_finished:${runId}`, ({code}) => setLines(prev=>[...prev, `\nProcess finished with code ${code}`]))
    return ()=>{ socket.off(`run_log:${runId}`); socket.off(`run_finished:${runId}`) }
  }, [runId])

  const onFile = (f)=>{
    if(!f) return
    setFile(f)
    setCsvData([])
    
    // Read file using xlsx library
    const reader = new FileReader()
    reader.onload = (e)=>{
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        
        // Get first sheet
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })
        
        // Filter out empty rows
        const filteredData = jsonData.filter(row => row && row.some(cell => cell !== null && cell !== undefined && cell !== ''))
        
        setCsvData(filteredData)
        setAnalysis({ 
          fileName: f.name, 
          fileSize: (f.size / 1024).toFixed(2) + ' KB',
          totalRows: filteredData.length - 1, // excluding header
          columns: filteredData[0] || []
        })
      } catch (error) {
        console.error('Error reading file:', error)
        alert('Error reading file. Make sure it\'s a valid Excel/CSV file.')
      }
    }
    reader.readAsArrayBuffer(f)
  }

  const handleStart = async ()=>{
    if(!file) return alert('Please upload a file')
    if(!selectedClient) return alert('Please select a client')
    if(!rzpCommission) return alert('Please enter RZP commission')
    if(!isEnvSelected()) return alert('Please select an environment (Test or Prod) from the navbar')
    
    const fd = new FormData()
    fd.append('file', file)
    fd.append('email', user?.email || 'unknown')
    fd.append('env', environment.toUpperCase())
    fd.append('client', JSON.stringify(selectedClient || {}))
    fd.append('amountType', amountType)
    fd.append('rzpCommission', rzpCommission)
    fd.append('password', password)

    const res = await fetch('http://localhost:5001/stock/upload', { method: 'POST', body: fd })
    const data = await res.json()
    if(data.success){ setRunId(data.runId); setShowModal(false); setLines(['Run started...']) }
    else alert('error starting run')
  }

  return (
    <div>
      <Navbar />
      <div className="p-6 pb-72">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Stock Upload</h1>
          {!isEnvSelected() && (
            <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-yellow-800 mb-1">Environment Not Selected</h3>
              <p className="text-yellow-700 text-sm">Please select an environment (Test or Prod) from the navbar dropdown before uploading.</p>
            </div>
          )}
          {isEnvSelected() && (
            <div className="bg-green-50 border border-green-300 rounded-lg p-3 mb-4">
              <p className="text-green-800 text-sm">
                <strong>Environment:</strong> {getEnvLabel()}
              </p>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <DragDropArea onFile={onFile} />
            
            {file && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                <p className="text-sm text-green-800">File selected: <strong>{file.name}</strong></p>
              </div>
            )}

            <input 
              placeholder="File password (if protected)" 
              value={password} 
              onChange={e=>setPassword(e.target.value)} 
              className="border p-2 mt-3 w-full rounded" 
            />

            {file && csvData.length > 0 && (
              <button 
                onClick={()=>setShowPreview(true)} 
                className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 w-full"
              >
                Preview File
              </button>
            )}

            <div className="mt-3">
              <label className="block mb-1 font-medium">Client</label>
              <select 
                className="w-full border p-2 rounded" 
                onChange={e=>{
                  const val = e.target.value
                  if(val === '__add__') {
                    alert('Add client feature - Coming soon!')
                  } else if(val === '__edit__') {
                    alert('Edit/Delete client feature - Coming soon!')
                  } else if(val) {
                    setSelectedClient(JSON.parse(val))
                  }
                }}
              >
                <option value="">Select client</option>
                {clientList.map(c=> <option key={c.offer_id} value={JSON.stringify(c)}>{c.name}</option>)}
                <option value="__add__">Add New Client</option>
                <option value="__edit__">Edit/Delete Clients</option>
              </select>
            </div>

            <div className="mt-3">
              <label className="block mb-1 font-medium">Amount Type</label>
              <select value={amountType} onChange={e=>setAmountType(e.target.value)} className="border p-2 rounded w-full">
                <option value="rupee">Rupee (will convert to paisa)</option>
                <option value="paisa">Paisa (as is)</option>
              </select>
            </div>

            <div className="mt-3">
              <label className="block mb-1 font-medium">RZP Commission (%)</label>
              <input 
                type="number"
                placeholder="e.g., 5 for 5%"
                value={rzpCommission} 
                onChange={e=>setRzpCommission(e.target.value)} 
                className="border p-2 w-full rounded" 
              />
            </div>

            <div className="mt-4">
              <button 
                onClick={()=>setShowModal(true)} 
                className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 w-full font-semibold"
              >
                Start Upload
              </button>
            </div>

            {analysis && (
              <div className="mt-4 border p-4 rounded bg-gray-50">
                <h3 className="font-semibold mb-2">File Info</h3>
                <p><strong>File:</strong> {analysis.fileName}</p>
                <p><strong>Size:</strong> {analysis.fileSize}</p>
                {analysis.totalRows && <p><strong>Total Rows:</strong> {analysis.totalRows}</p>}
                {analysis.columns && analysis.columns.length > 0 && (
                  <p><strong>Columns:</strong> {analysis.columns.join(', ')}</p>
                )}
              </div>
            )}
          </div>

          <div>
            <h3 className="font-semibold mb-2">Instructions</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>Upload CSV/Excel file with voucher codes</li>
              <li>Select the client (Swiggy, Spencer, etc.)</li>
              <li>Choose amount type (rupee or paisa)</li>
              <li>Enter RZP commission percentage</li>
              <li>Click "Start Upload" to begin</li>
              <li>Monitor progress in terminal below</li>
            </ul>
            
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Files are stored in backend/storage/stock_uploads
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && csvData.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-11/12 h-5/6 flex flex-col">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold">File Preview: {file?.name}</h3>
              <button 
                onClick={()=>setShowPreview(false)} 
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Close
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <table className="w-full border-collapse border text-sm">
                <thead className="sticky top-0 bg-gray-100">
                  <tr>
                    <th className="border p-2 bg-gray-200">#</th>
                    {csvData[0]?.map((header,i)=> (
                      <th key={i} className="border p-2 text-left bg-gray-200 font-semibold">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvData.slice(1).map((row,i)=> (
                    <tr key={i} className="hover:bg-blue-50">
                      <td className="border p-2 text-center bg-gray-50 font-mono text-xs">{i+1}</td>
                      {row.map((cell,j)=> (
                        <td key={j} className="border p-2">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {csvData.length > 100 && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-center">
                  <p className="text-sm text-blue-800">
                    Showing first 100 rows. Total rows: {analysis?.totalRows}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <PreRunModal 
        open={showModal} 
        meta={{ file: file?.name, client: selectedClient, amountType, rzpCommission }} 
        onCancel={()=>setShowModal(false)} 
        onStart={handleStart} 
      />
      
      <div className="fixed bottom-0 left-0 right-0">
        <Terminal lines={lines} />
      </div>
    </div>
  )
}
