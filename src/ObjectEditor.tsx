import { useEffect, useState } from 'react'
import type { SceneEditor } from './useSceneEditor'
import { objectTransform } from './worlds/transforms'

export default function ObjectEditor({ editor }: { editor: SceneEditor }) {
  const selected = editor.selected
  const [draft, setDraft] = useState({x:0,z:0,size:1,rotation:0})
  useEffect(() => { if (selected) setDraft(objectTransform(selected)) }, [selected?.id,selected?.x,selected?.z,selected?.size,selected?.rotation])
  return <section className="object-editor" aria-label="物件编辑器">
    <div className="editor-heading"><h4>安排你的世界</h4><div><button className="upload" disabled={!editor.canUndo} onClick={editor.undo}>撤销调整</button><button className="upload" disabled={!editor.canRedo} onClick={editor.redo}>重做调整</button></div></div>
    {selected ? <>
      <p className="selected-wish">{selected.wish}</p><button className="upload" onClick={()=>editor.select(null)}>完成编辑</button>
      <button className="upload" aria-pressed={editor.placing} onClick={()=>editor.setPlacing(!editor.placing)}>{editor.placing?'取消摆放':'在场景中摆放'}</button>
      <p className="editor-hint">{editor.placing?'点击浅色空地确定位置，Esc 可取消。':'拖动仍可环顾。位置调整限于中央空地，物件始终贴地。'}</p>
      <form onSubmit={event=>{event.preventDefault();editor.apply(draft)}}>
        <div className="position-inputs"><label>左右位置<input aria-label="左右位置" type="number" min={(selected.music?.motif || selected.id.startsWith('growth-v2-')) ? -24 : -3.8} max={(selected.music?.motif || selected.id.startsWith('growth-v2-')) ? 24 : 3.8} step="any" required value={Number.isFinite(draft.x)?Number(draft.x.toFixed(2)):''} onChange={e=>setDraft({...draft,x:e.target.valueAsNumber})}/></label><label>前后位置<input aria-label="前后位置" type="number" min={(selected.music?.motif || selected.id.startsWith('growth-v2-')) ? -24 : -3.8} max={(selected.music?.motif || selected.id.startsWith('growth-v2-')) ? 24 : 3.8} step="any" required value={Number.isFinite(draft.z)?Number(draft.z.toFixed(2)):''} onChange={e=>setDraft({...draft,z:e.target.valueAsNumber})}/></label></div>
        <label className="editor-range">大小 <output>{draft.size.toFixed(2)} 倍</output><input aria-label="物件大小" type="range" min="0.5" max="2" step="0.05" value={draft.size} onChange={e=>setDraft({...draft,size:Number(e.target.value)})}/></label>
        <label className="editor-range">朝向 <output>{Math.round(draft.rotation*180/Math.PI)}°</output><input aria-label="物件朝向" type="range" min="0" max="360" step="5" value={Math.round(draft.rotation*180/Math.PI)} onChange={e=>setDraft({...draft,rotation:Number(e.target.value)*Math.PI/180})}/></label>
        <button className="primary" type="submit">应用调整</button>
      </form>
    </> : <p className="editor-hint">从下方记录选择一件物件，或点击场景中的私人植被。</p>}
  </section>
}
