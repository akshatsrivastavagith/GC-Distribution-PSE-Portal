import { useEffect, useRef } from 'react'

export default function Terminal({lines}){
  const ref = useRef()
  useEffect(()=>{ if(ref.current) ref.current.scrollTop = ref.current.scrollHeight }, [lines])

  return (
    <div ref={ref} className="bg-black text-white font-mono p-3 h-64 overflow-auto text-sm">
      {lines.map((l,i)=> <div key={i} dangerouslySetInnerHTML={{__html: l.replace(/\n/g,'<br/>')}} />)}
    </div>
  )
}

