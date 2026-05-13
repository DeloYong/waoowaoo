import TaskStatusInline from '@/components/task/TaskStatusInline'
import VoiceDesignGeneratorSection from '@/components/voice/VoiceDesignGeneratorSection'
import type { VoiceCreationRuntime } from './hooks/useVoiceCreation'

interface VoicePreviewSectionProps {
  runtime: VoiceCreationRuntime
}

export default function VoicePreviewSection({ runtime }: VoicePreviewSectionProps) {
  const {
    mode,
    voiceName,
    voicePrompt,
    previewText,
    schemeCount,
    isVoiceCreationSubmitting,
    isSaving,
    error,
    generatedVoices,
    selectedIndex,
    playingIndex,
    uploadFile,
    uploadPreviewUrl,
    isUploading,
    isDragging,
    fileInputRef,
    voiceCreationSubmittingState,
    uploadSubmittingState,
    tHub,
    tvCreate,
    setVoicePrompt,
    setPreviewText,
    setSchemeCount,
    setSelectedIndex,
    setUploadFile,
    setUploadPreviewUrl,
    handleGenerate,
    handlePlayVoice,
    handleSaveDesigned,
    handleFileSelect,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handlePlayUpload,
    handleSaveUploaded,
  } = runtime

  return (
    <>
      {mode === 'design' && (
        <VoiceDesignGeneratorSection
          voicePrompt={voicePrompt}
          onVoicePromptChange={setVoicePrompt}
          previewText={previewText}
          onPreviewTextChange={setPreviewText}
          schemeCount={schemeCount}
          onSchemeCountChange={setSchemeCount}
          isSubmitting={isVoiceCreationSubmitting}
          submittingState={voiceCreationSubmittingState}
          error={error}
          generatedVoices={generatedVoices}
          selectedIndex={selectedIndex}
          onSelectIndex={setSelectedIndex}
          playingIndex={playingIndex}
          onPlayVoice={handlePlayVoice}
          onGenerate={() => {
            void handleGenerate()
          }}
          footer={(
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  void handleGenerate()
                }}
                disabled={isVoiceCreationSubmitting}
                className="border border-white/20 text-white/70 hover:border-[var(--wuhu-neon-pink)] hover:text-white hover:bg-white/10 flex-1 py-2 rounded-lg text-sm"
              >
                {tHub('regenerate')}
              </button>
              <button
                onClick={() => {
                  void handleSaveDesigned()
                }}
                disabled={selectedIndex === null || isSaving || !voiceName.trim()}
                className="bg-[var(--wuhu-neon-cyan)]/20 text-[var(--wuhu-neon-cyan)] border border-[var(--wuhu-neon-cyan)]/30 hover:bg-[var(--wuhu-neon-cyan)]/30 flex-1 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
              >
                {isSaving ? tHub('modal.adding') : tHub('save')}
              </button>
            </div>
          )}
        />
      )}

      {mode === 'upload' && (
        <>
          {!uploadFile ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${isDragging
                ? 'border-[var(--wuhu-neon-pink)] bg-[var(--wuhu-neon-purple)]/10'
                : 'border-white/20 hover:border-[var(--wuhu-neon-pink)] hover:bg-white/10'
                }`}
            >
              <div className="text-sm text-white/70 mb-2">{tvCreate('dropOrClick')}</div>
              <div className="text-xs text-white/40">{tvCreate('supportedFormats')}</div>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleFileSelect(file)
                }}
                className="hidden"
              />
            </div>
          ) : (
            <div className="bg-[var(--wuhu-bg-surface)] border border-white/20 rounded-xl p-4">
              <div className="text-sm font-medium text-white truncate">{uploadFile.name}</div>
              <button
                onClick={() => {
                  setUploadFile(null)
                  if (uploadPreviewUrl) URL.revokeObjectURL(uploadPreviewUrl)
                  setUploadPreviewUrl(null)
                }}
                className="p-1 mt-2 text-white/40 hover:text-white hover:bg-white/10"
              >
                ×
              </button>
              {uploadPreviewUrl && (
                <button
                  onClick={handlePlayUpload}
                  className="bg-gradient-to-r from-[var(--wuhu-neon-purple)] to-[var(--wuhu-neon-pink)] text-white shadow-[0_0_15px_rgba(167,87,255,0.4)] hover:shadow-[0_0_25px_rgba(255,100,200,0.5)] w-full py-2 rounded-lg text-sm font-medium mt-2"
                >
                  {tvCreate('previewAudio')}
                </button>
              )}
            </div>
          )}

          {uploadFile && (
            <button
              onClick={handleSaveUploaded}
              disabled={isUploading || !voiceName.trim()}
              className="bg-[var(--wuhu-neon-cyan)]/20 text-[var(--wuhu-neon-cyan)] border border-[var(--wuhu-neon-cyan)]/30 hover:bg-[var(--wuhu-neon-cyan)]/30 w-full py-2.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center justify-center gap-2"
            >
              {isUploading ? (
                <TaskStatusInline
                  state={uploadSubmittingState}
                  className="text-white [&>span]:text-white [&_svg]:text-white"
                />
              ) : (
                tHub('save')
              )}
            </button>
          )}
        </>
      )}

      {mode === 'upload' && error && (
        <div className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-lg">
          {error}
        </div>
      )}
    </>
  )
}
