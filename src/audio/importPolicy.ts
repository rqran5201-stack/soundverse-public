export const AUDIO_IMPORT_GUIDE = '推荐 PCM WAV；另已验证 MP3（桌面 Edge）。文件 ≤40 MiB，整曲分析 ≤5 分钟。本地处理，不上传原始音乐。M4A、FLAC 等尚未验证；NCM 加密文件不能直接使用。'
export function audioFileProblem(file: Pick<File,'name'|'type'|'size'>): string | null {
  if (/\.(ncm|qmc\w*|kgm|kwm)$/i.test(file.name)) return '这是加密音乐文件，浏览器不能直接读取。请使用你有权使用的 PCM WAV 或 MP3。'
  if (file.size > 40 * 1024 * 1024) return '文件超过 40 MiB，请选择较小的本地 PCM WAV 或 MP3。'
  if (!file.type.startsWith('audio/') && !/\.(wav|mp3|m4a|aac|ogg|flac|webm|opus)$/i.test(file.name)) return '无法识别这个音频文件。请使用有效的 PCM WAV 或 MP3。'
  return null
}
