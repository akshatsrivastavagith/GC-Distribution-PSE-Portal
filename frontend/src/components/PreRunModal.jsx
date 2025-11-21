export default function PreRunModal({open,meta,onStart,onCancel}){
  if(!open) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
      <div className="bg-white p-6 rounded w-2/3">
        <h3 className="text-lg font-semibold">Run Summary</h3>
        <pre className="text-sm mt-4 max-h-64 overflow-auto">{JSON.stringify(meta,null,2)}</pre>
        <div className="flex gap-2 mt-4 justify-end">
          <button onClick={onCancel} className="px-4 py-2 border rounded">Cancel</button>
          <button onClick={onStart} className="px-4 py-2 bg-black text-white rounded">Start Upload</button>
        </div>
      </div>
    </div>
  )
}

