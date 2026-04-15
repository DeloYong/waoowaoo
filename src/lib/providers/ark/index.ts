// Ark Provider 统一导出

// 音色设计（文本→音色）
export {
  createArkVoiceDesign,
} from './voice-design'
export type {
  ArkVoiceDesignInput,
  ArkVoiceDesignResult,
} from './voice-design'

// 音色克隆（音频→音色）
export {
  createArkVoiceClone,
} from './voice-clone'
export type {
  ArkVoiceCloneInput,
  ArkVoiceCloneResult,
} from './voice-clone'

// 音色管理（列表+删除）
export {
  listArkVoices,
  deleteArkVoice,
} from './voice-manage'
export type {
  ArkVoiceInfo,
  ArkListVoicesResult,
  ArkDeleteVoiceResult,
} from './voice-manage'

// 长文本TTS（openspeech异步API）
export {
  createArkLongTTS,
  submitLongTTS,
  queryLongTTS,
  synthesizeLongTTS,
} from './long-tts'
export type {
  ArkLongTTSInput,
  ArkLongTTSResult,
} from './long-tts'
