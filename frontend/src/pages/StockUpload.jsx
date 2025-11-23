import { API_BASE_URL, WS_URL } from "../config/api"
import { useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import ClientManagementModal from '../components/ClientManagementModal'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import { useEnvironment } from '../contexts/EnvironmentContext'
import { useAuth } from '../contexts/AuthContext'

export default function StockUpload() {
  const { isEnvSelected, getEnvLabel, environment } = useEnvironment()
  const { user } = useAuth()
  
  const [file, setFile] = useState(null)
  const [filePassword, setFilePassword] = useState('')
  const [isPasswordProtected, setIsPasswordProtected] = useState(false)
  const [showPasswordInput, setShowPasswordInput] = useState(false)
  const [csvData, setCsvData] = useState([])
  const [showPreview, setShowPreview] = useState(false)
  const [fileAnalysis, setFileAnalysis] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  
  // Client and commission states
  const [clientList, setClientList] = useState([])
  const [selectedClient, setSelectedClient] = useState('')
  const [rzpCommission, setRzpCommission] = useState('')
  const [commissionError, setCommissionError] = useState('')
  const [showClientModal, setShowClientModal] = useState(false)

  // Upload progress states
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadCompleted, setUploadCompleted] = useState(0)
  const [uploadTotal, setUploadTotal] = useState(0)
  const [executionLog, setExecutionLog] = useState([])
  const [showStopConfirm, setShowStopConfirm] = useState(false)
  const [runId, setRunId] = useState(null)
  
  // Summary states
  const [showSummary, setShowSummary] = useState(false)
  const [uploadSummary, setUploadSummary] = useState(null)
  const [resultCsvPath, setResultCsvPath] = useState(null)
  const [originalFileName, setOriginalFileName] = useState('')
  
  // Error states
  const [showError, setShowError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [errorDetails, setErrorDetails] = useState('')

  useEffect(() => {
    loadClients()
  }, [])

  const loadClients = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const res = await fetch(`${API_BASE_URL}/config/clients`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      const data = await res.json()
      setClientList(data || [])
    } catch (error) {
      console.error('Error loading clients:', error)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      handleFileSelection(droppedFile)
    }
  }

  const handleFileInput = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      handleFileSelection(selectedFile)
    }
  }

  const handleFileSelection = (selectedFile) => {
    // Validate file type
    const fileName = selectedFile.name.toLowerCase()
    if (!fileName.endsWith('.csv') && !fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      alert('Please upload a CSV or Excel file')
      return
    }

    setFile(selectedFile)
    
    // Store original filename (without extension) for download naming
    const originalName = selectedFile.name.replace(/\.(csv|xlsx|xls)$/i, '')
    setOriginalFileName(originalName)
    setCsvData([])
    setShowPasswordInput(false)
    setIsPasswordProtected(false)
    setFilePassword('')

    // Try to read the file
    readFile(selectedFile, '')
  }

  const readFile = (fileToRead, password) => {
    const reader = new FileReader()
    
    reader.onerror = (e) => {
      console.error('File read error:', e)
      setIsPasswordProtected(true)
      setShowPasswordInput(true)
      alert('This file appears to be password protected. Please enter the password.')
    }

    reader.onload = (e) => {
      try {
        const fileName = fileToRead.name.toLowerCase()
        
        if (fileName.endsWith('.csv')) {
          // Parse CSV
          const text = e.target.result
          Papa.parse(text, {
            complete: (results) => {
              if (results.data && results.data.length > 0) {
                const filteredData = results.data.filter(row => 
                  row && row.some(cell => cell !== null && cell !== undefined && cell !== '')
                )
                setCsvData(filteredData)
                analyzeCSVData(filteredData, fileToRead.name, fileToRead.size)
                setIsPasswordProtected(false)
                setShowPasswordInput(false)
              }
            },
            error: (error) => {
              console.error('CSV parse error:', error)
              alert('Error parsing CSV file: ' + error.message)
            }
          })
        } else {
          // Parse Excel (XLSX/XLS)
          try {
            const data = new Uint8Array(e.target.result)
            
            // Try to read with password if provided
            let readOptions = { type: 'array' }
            if (password) {
              readOptions.password = password
            }
            
            const workbook = XLSX.read(data, readOptions)
            
            // Successfully read workbook
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
            
            // Get data with raw: false to preserve formatted strings (for preview display)
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { 
              header: 1,
              raw: false,  // Get formatted strings instead of parsed values
              dateNF: 'dd-mmm-yyyy, hh:mm' // Preserve date format
            })
            
            const filteredData = jsonData.filter(row => 
              row && row.some(cell => cell !== null && cell !== undefined && cell !== '')
            )
            
            if (filteredData.length === 0) {
              throw new Error('File appears to be empty or encrypted')
            }
            
            setCsvData(filteredData)
            analyzeCSVData(filteredData, fileToRead.name, fileToRead.size, workbook.SheetNames[0])
            setIsPasswordProtected(false)
            setShowPasswordInput(false)
            setFilePassword('')
          } catch (error) {
            console.error('Excel read error:', error)
            console.log('Error details:', error.message)
            
            // If we haven't tried with password yet, ask for it
            if (!password) {
              setIsPasswordProtected(true)
              setShowPasswordInput(true)
              alert('Unable to read file. This file appears to be password protected.\n\nNote: Browser-based password unlocking has limitations. For best results, please remove the password in Excel before uploading.')
            } else {
              // Password was wrong or encryption not supported
              alert('Failed to unlock file. This could mean:\n\n1. The password is incorrect\n2. The encryption method is not supported in browser\n\nPlease remove the password in Excel and upload again:\n- Open file in Excel\n- File > Info > Protect Workbook > Encrypt with Password\n- Delete the password and save')
              setFilePassword('')
            }
          }
        }
      } catch (error) {
        console.error('General file read error:', error)
        alert('Error reading file: ' + error.message)
      }
    }

    // Read file based on type
    if (fileToRead.name.toLowerCase().endsWith('.csv')) {
      reader.readAsText(fileToRead)
    } else {
      reader.readAsArrayBuffer(fileToRead)
    }
  }

  const handlePasswordSubmit = () => {
    if (!filePassword) {
      alert('Please enter the file password')
      return
    }
    
    alert('Note: Password-protected Excel files have limited browser support. If unlocking fails, please:\n\n1. Open the file in Excel\n2. Remove the password (File > Info > Protect Workbook > Encrypt with Password > Delete password)\n3. Save the file\n4. Upload the unprotected version\n\nTrying to unlock with the provided password...')
    
    readFile(file, filePassword)
  }

  const openPreview = () => {
    if (csvData.length === 0) {
      alert('No data to preview')
      return
    }
    setShowPreview(true)
  }

  const closePreview = () => {
    setShowPreview(false)
  }

  // Handle Escape key to close modals
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        if (showPreview) {
          closePreview()
        } else if (showSummary) {
          closeSummaryModal()
        } else if (showError) {
          setShowError(false)
        }
      }
    }

    if (showPreview || showSummary || showError) {
      document.addEventListener('keydown', handleEscapeKey)
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [showPreview, showSummary, showError])

  const handleClientChange = (e) => {
    const value = e.target.value
    if (value === 'EDIT_CLIENTS') {
      setShowClientModal(true)
    } else {
      setSelectedClient(value)
    }
  }

  const handleClientsUpdated = (updatedClients) => {
    setClientList(updatedClients)
  }

  const validateCommission = (value) => {
    if (!value || value.trim() === '') {
      setCommissionError('')
      return null
    }

    // Remove % sign and whitespace
    const cleaned = value.toString().replace(/%/g, '').trim()
    
    // Check if it's a valid number
    const num = parseFloat(cleaned)
    if (isNaN(num)) {
      setCommissionError('Please enter a valid number (e.g., 5 or 5%)')
      return null
    }

    if (num < 0) {
      setCommissionError('Commission cannot be negative')
      return null
    }

    setCommissionError('')
    return num
  }

  const handleCommissionChange = (e) => {
    const value = e.target.value
    setRzpCommission(value)
    validateCommission(value)
  }

  const getCommissionValue = () => {
    if (!rzpCommission || rzpCommission.trim() === '') {
      return ''
    }
    
    // Remove % sign and whitespace
    const cleaned = rzpCommission.toString().replace(/%/g, '').trim()
    
    // Check if it's a valid number
    const num = parseFloat(cleaned)
    if (isNaN(num) || num < 0) {
      return ''
    }
    
    return num
  }

  // Prevent page unload during upload
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isUploading) {
        e.preventDefault()
        e.returnValue = 'Upload is in progress. Are you sure you want to leave?'
        
        // Pause the upload
        if (runId) {
          handlePauseUpload()
        }
        
        return e.returnValue
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isUploading, runId])

  // Upload handlers
  const handleStartUpload = async () => {
    if (!file || !selectedClient || !rzpCommission) {
      alert('Please fill all required fields')
      return
    }

    // Convert parsed CSV data to CSV string (properly escape values)
    const escapeCsvValue = (value) => {
      const stringValue = String(value || '')
      // If value contains comma, quote, or newline, wrap in quotes and escape quotes
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`
      }
      return stringValue
    }
    
    const csvString = csvData.map(row => 
      row.map(escapeCsvValue).join(',')
    ).join('\n')
    
    const csvBlob = new Blob([csvString], { type: 'text/csv' })
    const csvFile = new File([csvBlob], file.name.replace(/\.(xlsx|xls)$/i, '.csv'), { type: 'text/csv' })

    const formData = new FormData()
    formData.append('file', csvFile)
    formData.append('email', user?.email || user?.username || 'unknown')
    formData.append('env', environment)
    
    const clientObj = clientList.find(c => c.offer_id === selectedClient)
    formData.append('client', JSON.stringify(clientObj))
    formData.append('amountType', 'paise')
    formData.append('rzpCommission', rzpCommission)

    try {
      setIsUploading(true)
      setUploadProgress(0)
      setUploadCompleted(0)
      // Set the total from fileAnalysis so it shows real count from start
      setUploadTotal(fileAnalysis?.totalRows || 0)
      setExecutionLog([])

      const token = localStorage.getItem('authToken')
      const response = await fetch(`${API_BASE_URL}/stock/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      // Check for token expiration
      if (response.status === 401) {
        alert('Your session has expired. Please login again.')
        localStorage.removeItem('authToken')
        window.location.href = '/login'
        return
      }

      const result = await response.json()
      
      if (result.success) {
        const uploadRunId = result.runId
        setRunId(uploadRunId)
        setResultCsvPath(result.runFolder)
        
        // Connect to WebSocket for real-time updates
        connectWebSocket(uploadRunId)
      } else {
        setErrorMessage('Upload Failed')
        setErrorDetails(result.message || 'An unknown error occurred on the backend.')
        setShowError(true)
        setIsUploading(false)
      }
    } catch (error) {
      console.error('Upload error:', error)
      setErrorMessage('Upload Error')
      setErrorDetails(error.message || 'Failed to connect to backend server.')
      setShowError(true)
      setIsUploading(false)
    }
  }

  const connectWebSocket = (uploadRunId) => {
    const ws = new WebSocket(`${WS_URL}`)
    
    ws.onopen = () => {
      console.log('WebSocket connected')
    }

    ws.onmessage = (event) => {
      try {
        // Split by newlines in case multiple messages are batched together
        const messages = event.data.trim().split('\n').filter(line => line.trim())
        
        for (const msgStr of messages) {
          try {
            const wsMessage = JSON.parse(msgStr)
            
            // Handle different message types
            if (wsMessage.type === 'finished') {
              console.log('Upload finished')
              setIsUploading(false)
              continue
            }
            
            // Extract the line content
            const message = wsMessage.line || ''
            
            // Handle progress updates
            if (message.startsWith('PROGRESS:')) {
              const parts = message.substring(9).trim().split(':')
              const completed = parseInt(parts[0])
              const total = parseInt(parts[1])
              const percentage = parseInt(parts[2])
              
              setUploadCompleted(completed)
              setUploadTotal(total)
              setUploadProgress(percentage)
            }
            // Handle row execution logs
            else if (message.startsWith('ROW_LOG:')) {
              const logData = message.substring(8).trim()
              setExecutionLog(prev => [...prev, logData])
            }
            // Handle summary
            else if (message.startsWith('SUMMARY:')) {
              const summaryJson = message.substring(8).trim()
              try {
                const summary = JSON.parse(summaryJson)
                setUploadSummary(summary)
                setShowSummary(true)
                setIsUploading(false)
                
                // Auto-download result CSV using the parsed summary directly
                setTimeout(() => {
                  downloadResultCSVWithSummary(summary)
                }, 1000)
              } catch (e) {
                console.error('Failed to parse summary:', e)
              }
            }
          } catch (e) {
            console.error('Failed to parse individual message:', e, msgStr)
          }
        }
      } catch (e) {
        console.error('Failed to process WebSocket message:', e, event.data)
      }
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      setErrorMessage('WebSocket Connection Error')
      setErrorDetails('Failed to establish real-time connection with backend. Please check if the backend server is running.')
      setShowError(true)
      setIsUploading(false)
    }

    ws.onclose = () => {
      console.log('WebSocket disconnected')
    }
  }

  const handleStopClick = async () => {
    // Immediately pause execution when stop button is clicked
    await handlePauseUpload()
    // Then show confirmation modal
    setShowStopConfirm(true)
  }

  const handlePauseUpload = async () => {
    if (!runId) return
    
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`http://localhost:5001/stock/control/${runId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'pause' })
      })
      
      if (response.status === 401) {
        alert('Your session has expired. Please login again.')
        localStorage.removeItem('authToken')
        window.location.href = '/login'
      }
    } catch (error) {
      console.error('Pause error:', error)
    }
  }

  const handleResumeUpload = async () => {
    if (!runId) return
    
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`http://localhost:5001/stock/control/${runId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'resume' })
      })
      
      if (response.status === 401) {
        alert('Your session has expired. Please login again.')
        localStorage.removeItem('authToken')
        window.location.href = '/login'
        return
      }
      
      setShowStopConfirm(false)
    } catch (error) {
      console.error('Resume error:', error)
    }
  }

  const handleConfirmStop = async () => {
    if (!runId) return
    
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`http://localhost:5001/stock/control/${runId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action: 'stop' })
      })
      
      if (response.status === 401) {
        alert('Your session has expired. Please login again.')
        localStorage.removeItem('authToken')
        window.location.href = '/login'
        return
      }
      
      setShowStopConfirm(false)
      setIsUploading(false)
    } catch (error) {
      console.error('Stop error:', error)
    }
  }

  const downloadResultCSVWithSummary = async (summary) => {
    if (!summary || !summary.resultCsvPath || !summary.runId) {
      console.error('No result CSV path available', summary)
      return
    }
    
    try {
      const token = localStorage.getItem('authToken')
      const downloadUrl = `http://localhost:5001/stock/download/${summary.runId}/${summary.resultCsvPath}`
      
      console.log('Downloading CSV from:', downloadUrl)
      
      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.status === 401) {
        alert('Your session has expired. Please login again.')
        localStorage.removeItem('authToken')
        window.location.href = '/login'
        return
      }
      
      if (!response.ok) {
        throw new Error('Download failed')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      
      // Generate custom filename: stock_uploaded_FILENAME_DD_MMM_YYYY_HH_MM.csv
      const now = new Date()
      const day = String(now.getDate()).padStart(2, '0')
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const month = months[now.getMonth()]
      const year = now.getFullYear()
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      
      // Use originalFileName if available, otherwise fallback to a default
      const baseFilename = originalFileName || 'file'
      const filename = `stock_uploaded_${baseFilename}_${day}_${month}_${year}_${hours}_${minutes}.csv`
      
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      console.log('CSV downloaded successfully as:', filename)
    } catch (error) {
      console.error('Download error:', error)
      setErrorMessage('Download Failed')
      setErrorDetails('Failed to download the result CSV file. Please try again.')
      setShowError(true)
    }
  }

  const downloadResultCSV = async () => {
    // This function uses the state, called from the manual download button
    if (!uploadSummary || !uploadSummary.resultCsvPath || !uploadSummary.runId) {
      console.error('No result CSV path available')
      return
    }
    
    await downloadResultCSVWithSummary(uploadSummary)
  }

  const closeSummaryModal = () => {
    setShowSummary(false)
    
    // If upload was successful (no failures or all succeeded), clear the form
    if (uploadSummary && uploadSummary.failed === 0) {
      // Clear all form fields for next upload
      setFile(null)
      setCsvData([])
      setFileAnalysis(null)
      setSelectedClient('')
      setRzpCommission('')
      setCommissionError('')
      setShowPasswordInput(false)
      setFilePassword('')
      
      // Reset file input
      const fileInputs = document.querySelectorAll('input[type="file"]')
      fileInputs.forEach(input => {
        input.value = ''
      })
    }
    // If there were failures, keep the form filled so user can retry
  }

  // Map column names to standard fields
  const mapColumnName = (columnName) => {
    const normalized = columnName.toLowerCase().trim()
    
    // Voucher Code mapping
    if (normalized === 'code' || normalized === 'cardnumber' || normalized === 'card number') {
      return 'voucher_code'
    }
    // PIN mapping
    if (normalized === 'secret' || normalized === 'cardpin' || normalized === 'pin') {
      return 'pin'
    }
    // Amount mapping
    if (normalized === 'amount' || normalized === 'denomination') {
      return 'voucher_value'
    }
    // Validity mapping
    if (normalized === 'validity' || normalized === 'expirydate' || normalized === 'expiry date') {
      return 'expiry_date'
    }
    return normalized
  }

  // Parse different date formats to Unix timestamp and return both timestamp and Date object
  const parseDate = (dateStr) => {
    if (!dateStr) return null
    
    try {
      let date = null
      
      // If it's already a Date object (from XLSX), use it directly
      if (dateStr instanceof Date) {
        date = dateStr
      } else {
        // Convert to string and clean
        let cleaned = dateStr.toString().trim()
        
        // Handle Excel serial date numbers (days since 1900-01-01)
        // Excel dates are usually numbers > 1000
        if (!isNaN(cleaned) && parseFloat(cleaned) > 1000) {
          const excelEpoch = new Date(1899, 11, 30)
          const days = parseFloat(cleaned)
          date = new Date(excelEpoch.getTime() + days * 24 * 60 * 60 * 1000)
        }
        // Format: "2026-08-16 00:00:00 UTC" or "2026-08-16 00:00:00" or "2026-08-16" (YYYY-MM-DD)
        // Must be 4 digits for year, then 1-2 digits for month and day
        else if (cleaned.includes('-') && /^\d{4}-\d{1,2}-\d{1,2}/.test(cleaned)) {
          // Check if string contains UTC before removing it
          const isUTC = cleaned.includes('UTC')
          // Remove " UTC" suffix if present
          cleaned = cleaned.replace(' UTC', '').trim()
          
          if (isUTC) {
            // Parse as UTC time by appending 'Z' (ISO 8601 UTC indicator)
            // If it doesn't have time component, add it
            if (!cleaned.includes(':')) {
              cleaned = cleaned + 'T00:00:00Z'
            } else {
              // Replace space with 'T' and add 'Z' for proper ISO format
              cleaned = cleaned.replace(' ', 'T') + 'Z'
            }
          }
          date = new Date(cleaned)
        }
        // Format: "17-May-2026, 23:59" or "17-May-2026" or "16-Aug-2026"
        else if (cleaned.includes('-') && /[a-zA-Z]/.test(cleaned)) {
          // Has letters (month name like May, Jan, etc.)
          if (cleaned.includes(',')) {
            // Has time component like "17-May-2026, 23:59"
            const parts = cleaned.split(',').map(p => p.trim())
            const datePart = parts[0].trim()
            const timePart = parts[1] ? parts[1].trim() : '00:00'
            
            // Parse date part: "17-May-2026" or "17-5-2026"
            const dateMatch = datePart.match(/^(\d{1,2})-([a-zA-Z0-9]+)-(\d{4})$/)
            if (dateMatch) {
              const day = parseInt(dateMatch[1])
              const monthOrName = dateMatch[2]
              const year = parseInt(dateMatch[3])
              
              // Parse time part: "23:59"
              const timeMatch = timePart.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
              let hours = 0, minutes = 0, seconds = 0
              if (timeMatch) {
                hours = parseInt(timeMatch[1])
                minutes = parseInt(timeMatch[2])
                seconds = timeMatch[3] ? parseInt(timeMatch[3]) : 0
              }
              
              // Determine if month is a number or name
              let month
              if (/^\d+$/.test(monthOrName)) {
                // Numeric month (1-12)
                month = parseInt(monthOrName) - 1  // JavaScript months are 0-indexed
              } else {
                // Month name
                const monthMap = {
                  'jan': 0, 'january': 0,
                  'feb': 1, 'february': 1,
                  'mar': 2, 'march': 2,
                  'apr': 3, 'april': 3,
                  'may': 4,
                  'jun': 5, 'june': 5,
                  'jul': 6, 'july': 6,
                  'aug': 7, 'august': 7,
                  'sep': 8, 'september': 8,
                  'oct': 9, 'october': 9,
                  'nov': 10, 'november': 10,
                  'dec': 11, 'december': 11
                }
                month = monthMap[monthOrName.toLowerCase()]
              }
              
              if (month !== undefined && month >= 0 && month <= 11) {
                // Create date in local timezone (IST)
                // Using Date constructor with all parameters ensures local timezone
                date = new Date(year, month, day, hours, minutes, seconds, 0)
              }
            }
            
            if (!date || isNaN(date.getTime())) {
              // Fallback to simple parsing
              date = new Date(`${datePart} ${timePart}`)
            }
          } else {
            // No time component
            date = new Date(cleaned)
          }
        }
        // Format: "20-11-2026" or "05-12-2025" (DD-MM-YYYY with all numbers)
        // Check: 1-2 digits, dash, 1-2 digits, dash, 4 digits
        else if (cleaned.includes('-') && /^\d{1,2}-\d{1,2}-\d{4}/.test(cleaned)) {
          const parts = cleaned.split(',')[0].split('-')
          if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
            const [day, month, year] = parts
            date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
          }
        }
        // Format: "3/28/26" (M/D/YY)
        else if (cleaned.includes('/')) {
          const parts = cleaned.split('/')
          if (parts.length === 3) {
            let [month, day, year] = parts
            // Convert 2-digit year to 4-digit
            if (year.length === 2) {
              year = '20' + year
            }
            date = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
          }
        }
      }
      
      if (date && !isNaN(date.getTime())) {
        return {
          timestamp: Math.floor(date.getTime() / 1000),
          dateObj: date
        }
      }
      return null
    } catch (e) {
      console.error('Date parse error:', dateStr, e)
      return null
    }
  }
  
  // Format date to "DD MMM YYYY" format
  const formatDateDisplay = (dateObj) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const day = dateObj.getDate()
    const month = months[dateObj.getMonth()]
    const year = dateObj.getFullYear()
    return `${day} ${month} ${year}`
  }

  // Analyze CSV data and create summary
  const analyzeCSVData = (data, fileName, fileSize, sheetName = null) => {
    if (data.length < 2) {
      setFileAnalysis({
        fileName,
        fileSize: (fileSize / 1024).toFixed(2) + ' KB',
        totalRows: 0,
        columns: [],
        summary: []
      })
      return
    }

    const headers = data[0]
    const rows = data.slice(1)

    // Map headers to standard fields
    const headerMap = {}
    headers.forEach((header, index) => {
      headerMap[index] = mapColumnName(header)
    })

    // Find column indices
    const codeIndex = Object.keys(headerMap).find(k => headerMap[k] === 'voucher_code')
    const amountIndex = Object.keys(headerMap).find(k => headerMap[k] === 'voucher_value')
    const validityIndex = Object.keys(headerMap).find(k => headerMap[k] === 'expiry_date')

    // Group by denomination
    const denominationGroups = {}
    
    rows.forEach(row => {
      if (!row[amountIndex]) return
      
      const amount = parseInt(row[amountIndex])
      const validityRaw = row[validityIndex]
      const parsedDate = parseDate(validityRaw)
      
      if (!denominationGroups[amount]) {
        denominationGroups[amount] = {
          count: 0,
          validityDates: new Map() // Map to store unique date strings with their timestamps
        }
      }
      
      denominationGroups[amount].count++
      
      // Add validity date to the map if parseable
      if (parsedDate && parsedDate.timestamp) {
        // Use the EXACT original date string from CSV for display
        let displayDate = validityRaw ? validityRaw.toString().trim() : ''
        
        const key = `${displayDate}|${parsedDate.timestamp}` // Unique key
        denominationGroups[amount].validityDates.set(key, {
          display: displayDate,
          timestamp: parsedDate.timestamp
        })
      }
    })

    // Create summary table
    const summary = Object.keys(denominationGroups)
      .map(denom => parseInt(denom))
      .sort((a, b) => a - b)
      .map(denom => {
        const group = denominationGroups[denom]
        return {
          denomination: denom,
          count: group.count,
          totalAmount: denom * group.count,
          validityDates: Array.from(group.validityDates.values())
        }
      })

    const grandTotal = summary.reduce((sum, item) => sum + item.totalAmount, 0)

    setFileAnalysis({
      fileName,
      fileSize: (fileSize / 1024).toFixed(2) + ' KB',
      totalRows: rows.length,
      columns: headers,
      sheetName,
      summary,
      grandTotal
    })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-6xl mx-auto p-6">
        {/* Environment Warning */}
        {!isEnvSelected() && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Please select an environment (TEST or PROD) from the dropdown in the navigation bar before uploading.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Current Environment */}
        {isEnvSelected() && (
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-6">
            <p className="text-sm text-blue-700">
              <strong>Current Environment:</strong> {getEnvLabel()}
            </p>
          </div>
        )}

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Stock Upload</h1>
          <p className="text-gray-600">Upload CSV or Excel files for processing</p>
        </div>

        {/* File Upload Area */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Upload File</h2>
          
          {/* Drag and Drop Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              isDragging 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-blue-400'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {!file ? (
              <>
                <div className="mb-4">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="text-lg text-gray-700 mb-2">
                  Drag and drop your file here
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  or
                </p>
                <label className="inline-block">
                  <span className="px-6 py-3 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition">
                    Choose File
                  </span>
                  <input 
                    type="file" 
                    className="hidden" 
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileInput}
                  />
                </label>
                <p className="text-xs text-gray-400 mt-4">
                  Supported formats: CSV, XLSX, XLS
                </p>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-center space-x-2">
                  <svg className="h-8 w-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-lg font-medium text-gray-700">File Uploaded</span>
                </div>
                
                {fileAnalysis && (
                  <div className="bg-gray-50 rounded p-4 text-left">
                    <p className="text-sm"><strong>File Name:</strong> {fileAnalysis.fileName}</p>
                    <p className="text-sm"><strong>File Size:</strong> {fileAnalysis.fileSize}</p>
                    <p className="text-sm"><strong>Total Rows:</strong> {fileAnalysis.totalRows}</p>
                    {fileAnalysis.sheetName && (
                      <p className="text-sm"><strong>Sheet:</strong> {fileAnalysis.sheetName}</p>
                    )}
                  </div>
                )}
                
                {/* Password Protected */}
                {showPasswordInput && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-4 space-y-3">
                    <div className="flex items-center space-x-2 text-yellow-700">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <span className="font-medium">Password Protected File</span>
                    </div>
                    <div className="bg-white border border-yellow-300 rounded p-3">
                      <p className="text-sm text-gray-700">
                        <strong>File:</strong> <span className="text-gray-900">{file.name}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        This file is password protected. Please enter the password to unlock it.
                      </p>
                    </div>
                    <input
                      type="password"
                      className="w-full p-3 border-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter file password"
                      value={filePassword}
                      onChange={(e) => setFilePassword(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                    />
                    <button
                      onClick={handlePasswordSubmit}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition font-medium"
                    >
                      Unlock File
                    </button>
                  </div>
                )}
                
                <div className="flex space-x-3 justify-center">
                  {csvData.length > 0 && (
                    <button
                      onClick={openPreview}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                    >
                      Preview Data
                    </button>
                  )}
                  
                  <label>
                    <span className="px-6 py-2 bg-gray-600 text-white rounded-lg cursor-pointer hover:bg-gray-700 transition inline-block">
                      Choose Different File
                    </span>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileInput}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* CSV Summary Table */}
        {file && csvData.length > 0 && !showPasswordInput && fileAnalysis?.summary && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">CSV Summary</h2>
            
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse border border-gray-300">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Denomination</th>
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold">RMP STOCK</th>
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold">AMT</th>
                    <th className="border border-gray-300 px-4 py-2 text-left font-semibold">Validity</th>
                  </tr>
                </thead>
                <tbody>
                  {fileAnalysis.summary.map((item, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-300 px-4 py-2">{item.denomination}</td>
                      <td className="border border-gray-300 px-4 py-2">{item.count}</td>
                      <td className="border border-gray-300 px-4 py-2">{item.totalAmount.toLocaleString()}</td>
                      <td className="border border-gray-300 px-4 py-2 text-sm">
                        {item.validityDates.length > 0 ? (
                          <div className="space-y-2">
                            {item.validityDates.map((dateInfo, idx) => (
                              <div key={idx} className="flex flex-col">
                                <span className="font-medium text-gray-800">{dateInfo.display}</span>
                                <span className="text-xs text-gray-500">Epoch: {dateInfo.timestamp}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">No validity</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-blue-100 font-semibold">
                    <td className="border border-gray-300 px-4 py-2">TOTAL</td>
                    <td className="border border-gray-300 px-4 py-2">{fileAnalysis.totalRows}</td>
                    <td className="border border-gray-300 px-4 py-2">{fileAnalysis.grandTotal.toLocaleString()}</td>
                    <td className="border border-gray-300 px-4 py-2"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Upload Configuration */}
        {file && csvData.length > 0 && !showPasswordInput && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Upload Configuration</h2>
            
            <div className="space-y-4">
              {/* Client Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Client <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedClient}
                  onChange={handleClientChange}
                  className="w-full p-3 border-2 rounded-lg focus:border-blue-500 focus:outline-none transition"
                >
                  <option value="">-- Choose Client --</option>
                  {clientList.map((client, index) => (
                    <option key={index} value={client.offer_id}>
                      {client.name}
                    </option>
                  ))}
                  <option value="EDIT_CLIENTS" className="font-semibold bg-gray-100">
                    --- Edit Clients ---
                  </option>
                </select>
                {selectedClient && selectedClient !== 'EDIT_CLIENTS' && (
                  <p className="text-xs text-gray-500 mt-1">
                    Offer ID: {selectedClient}
                  </p>
                )}
              </div>

              {/* RZP Commission */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  RZP Commission <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={rzpCommission}
                  onChange={handleCommissionChange}
                  placeholder="Enter commission (e.g., 5 or 5% or 7.5%)"
                  className={`w-full p-3 border-2 rounded-lg focus:outline-none transition ${
                    commissionError 
                      ? 'border-red-500 focus:border-red-500' 
                      : 'focus:border-blue-500'
                  }`}
                />
                {commissionError ? (
                  <p className="text-xs text-red-500 mt-1">{commissionError}</p>
                ) : (
                  <p className="text-xs text-gray-400 mt-1">
                    This value will be applied to all rows
                  </p>
                )}
              </div>

              {/* Summary Box */}
              {selectedClient && rzpCommission && !commissionError && getCommissionValue() !== '' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Upload Summary</h3>
                  <div className="text-sm text-blue-800 space-y-1">
                    <p><strong>Client:</strong> {clientList.find(c => c.offer_id === selectedClient)?.name}</p>
                    <p><strong>Offer ID:</strong> {selectedClient}</p>
                    <p><strong>RZP Commission:</strong> {getCommissionValue()}%</p>
                    <p><strong>Total Rows:</strong> {fileAnalysis?.totalRows}</p>
                    <p><strong>Environment:</strong> {getEnvLabel()}</p>
                  </div>
                </div>
              )}

              {/* Start Upload Button */}
              {selectedClient && rzpCommission && !commissionError && getCommissionValue() !== '' && !isUploading && (
                <div className="mt-6">
                  <button
                    className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold text-lg"
                    onClick={handleStartUpload}
                  >
                    Start Upload
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upload Progress Section */}
        {isUploading && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Upload Progress</h2>
              <button
                onClick={handleStopClick}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
              >
                Stop Upload
              </button>
            </div>

            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>{uploadCompleted} / {uploadTotal} rows completed</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-300 flex items-center justify-center text-white text-sm font-semibold"
                  style={{ width: `${uploadProgress}%` }}
                >
                  {uploadProgress > 10 && `${uploadProgress}%`}
                </div>
              </div>
            </div>

            {/* Execution Log */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Execution Log</h3>
              <div className="bg-black text-green-400 rounded-lg p-4 h-48 overflow-y-auto font-mono text-xs">
                {executionLog.length === 0 ? (
                  <p className="text-gray-500">Waiting for execution to start...</p>
                ) : (
                  executionLog.map((log, index) => {
                    const parts = log.split(',')
                    if (parts.length >= 4) {
                      const clientName = parts[0]
                      const voucherCode = parts[1]
                      const commission = parts[2]
                      const validity = parts[3]
                      const status = parts.slice(4).join(',')
                      
                      return (
                        <div key={index} className="mb-1">
                          <span className="text-blue-400">[{clientName}]</span>{' '}
                          <span className="text-yellow-400">{voucherCode}</span>{' '}
                          <span className="text-gray-400">Comm: {commission}</span>{' '}
                          <span className="text-gray-400">Valid: {validity}</span>{' '}
                          <span className={status.includes('Success') ? 'text-green-400' : 'text-red-400'}>
                            {status}
                          </span>
                        </div>
                      )
                    }
                    return <div key={index} className="mb-1">{log}</div>
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Client Management Modal */}
      <ClientManagementModal
        isOpen={showClientModal}
        onClose={() => setShowClientModal(false)}
        onSave={handleClientsUpdated}
      />

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-800">File Preview</h2>
              <button
                onClick={closePreview}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-6">
              {fileAnalysis && (
                <div className="mb-4 p-4 bg-gray-50 rounded">
                  <p className="text-sm"><strong>File:</strong> {fileAnalysis.fileName}</p>
                  <p className="text-sm"><strong>Total Rows:</strong> {fileAnalysis.totalRows}</p>
                  <p className="text-sm"><strong>Columns:</strong> {fileAnalysis.columns.length}</p>
                </div>
              )}
              
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-gray-300">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold">#</th>
                      {csvData[0] && csvData[0].map((header, idx) => (
                        <th key={idx} className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.slice(1, 51).map((row, rowIdx) => (
                      <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="border border-gray-300 px-4 py-2 text-sm text-gray-600">{rowIdx + 1}</td>
                        {row.map((cell, cellIdx) => (
                          <td key={cellIdx} className="border border-gray-300 px-4 py-2 text-sm">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {csvData.length > 51 && (
                  <p className="text-sm text-gray-500 mt-4 text-center">
                    Showing first 50 rows of {csvData.length - 1} total rows
                  </p>
                )}
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="p-6 border-t">
              <button
                onClick={closePreview}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stop Confirmation Modal */}
      {showStopConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-center mb-4">
                <div className="bg-yellow-100 rounded-full p-3">
                  <svg className="h-8 w-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
              <h2 className="text-xl font-bold text-center text-gray-800 mb-2">Stop Upload?</h2>
              <p className="text-center text-gray-600 mb-6">
                The upload has been paused. Do you want to continue or stop the upload?
              </p>
              <div className="space-y-3">
                <button
                  onClick={handleResumeUpload}
                  className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
                >
                  Continue Upload
                </button>
                <button
                  onClick={handleConfirmStop}
                  className="w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
                >
                  Stop Upload
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Summary Modal */}
      {showSummary && uploadSummary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-800">Upload Summary</h2>
              <button
                onClick={closeSummaryModal}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-blue-600">{uploadSummary.total}</p>
                  <p className="text-sm text-blue-800">Total Rows</p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-green-600">{uploadSummary.success}</p>
                  <p className="text-sm text-green-800">Successful</p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                  <p className="text-3xl font-bold text-red-600">{uploadSummary.failed}</p>
                  <p className="text-sm text-red-800">Failed</p>
                </div>
              </div>

              {/* Procurement Batch ID */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                <p className="text-sm font-semibold text-gray-700 mb-1">Procurement Batch ID:</p>
                <p className="text-lg font-mono text-gray-900">{uploadSummary.procurementBatchID}</p>
              </div>

              {/* Failed Rows Preview */}
              {uploadSummary.failed > 0 && uploadSummary.failedResults && uploadSummary.failedResults.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Failed Rows Preview</h3>
                  <div className="overflow-x-auto border border-gray-300 rounded-lg">
                    <table className="min-w-full border-collapse">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold">Row #</th>
                          <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold">Voucher Code</th>
                          <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold">Status</th>
                          <th className="border border-gray-300 px-4 py-2 text-left text-sm font-semibold">Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uploadSummary.failedResults.slice(0, 10).map((row, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="border border-gray-300 px-4 py-2 text-sm">{row.RowNumber}</td>
                            <td className="border border-gray-300 px-4 py-2 text-sm font-mono">{row.VoucherCode}</td>
                            <td className="border border-gray-300 px-4 py-2 text-sm">
                              <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                                {row.StatusCode || 'Error'}
                              </span>
                            </td>
                            <td className="border border-gray-300 px-4 py-2 text-sm text-red-600">
                              {row.ErrorMessage || 'Unknown error'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {uploadSummary.failedResults.length > 10 && (
                      <div className="bg-gray-50 border-t border-gray-300 px-4 py-2 text-center text-sm text-gray-600">
                        Showing 10 of {uploadSummary.failedResults.length} failed rows
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="p-6 border-t space-y-3">
              <button
                onClick={downloadResultCSV}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
              >
                Download Full Results CSV
              </button>
              <button
                onClick={closeSummaryModal}
                className="w-full px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Modal */}
      {showError && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg">
            <div className="p-6">
              <div className="flex items-center justify-center mb-4">
                <div className="bg-red-100 rounded-full p-3">
                  <svg className="h-12 w-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">{errorMessage}</h2>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-sm font-semibold text-red-800 mb-2">Error Details:</p>
                <p className="text-sm text-red-700 font-mono whitespace-pre-wrap">{errorDetails}</p>
              </div>
              <button
                onClick={() => setShowError(false)}
                className="w-full py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
