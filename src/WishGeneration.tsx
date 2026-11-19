import type { Seed } from './storage'
import type { useLuxGeneration } from './useLuxGeneration'

type Generation = ReturnType<typeof useLuxGeneration>
export default function WishGeneration({ seed, generation }: { seed: Seed; generation: Generation }) {
  const record = generation.records[seed.id]
  const busy = record?.state === 'submitting' || record?.state === 'uncertain' || seed.luxSubmissionUncertain
  return <div className="wish-generation">
    {!record && seed.luxSubmissionUncertain && !seed.luxJobId && <p role="status">上次提交结果待确认，请先查看 Aholo 任务记录，避免重复生成。</p>}
    {record && <p role="status" className="generation-status" data-state={record.state}>{record.message}</p>}
    {!seed.luxJobId && generation.available && <small>主动提交时，愿望文字会发送给群核，并保存在本机生成任务记录中。请勿在愿望里粘贴无权发送的歌词。</small>}
    {!seed.luxJobId && <button className="upload" disabled={!generation.available || busy} onClick={() => void generation.generate(seed)}>用 Lux3D 生成物件</button>}
    {seed.luxJobId && record?.state === 'paused' && <button className="upload" onClick={generation.resume}>继续查询</button>}
    {seed.luxJobId && record?.state === 'succeeded' && !generation.assets[seed.id] && <button className="upload" disabled={record.loading} onClick={() => void generation.loadModel(seed)}>{record.loading ? '模型加载中…' : '加载生成模型'}</button>}
  </div>
}
