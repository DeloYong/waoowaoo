'use client'

import VoiceDesignDialogBase, {
  type VoiceDesignMutationPayload,
  type VoiceDesignMutationResult,
  type VoiceDesignModelOption,
} from '@/components/voice/VoiceDesignDialogBase'
import { useDesignAssetHubVoice } from '@/lib/query/hooks'
import { useUserModels } from '@/lib/query/hooks/useUserModels'

interface VoiceDesignDialogProps {
  isOpen: boolean
  speaker: string
  hasExistingVoice?: boolean
  onClose: () => void
  onSave: (voiceId: string, audioBase64: string) => void
}

export default function VoiceDesignDialog({
  isOpen,
  speaker,
  hasExistingVoice = false,
  onClose,
  onSave,
}: VoiceDesignDialogProps) {
  const designVoiceMutation = useDesignAssetHubVoice()
  const { data: userModels } = useUserModels()

  const voiceDesignModels: VoiceDesignModelOption[] = (userModels?.voicedesign ?? []).map((m) => ({
    modelKey: m.value,
    name: m.label,
    provider: m.provider ?? '',
  }))

  const handleDesignVoice = async (
    payload: VoiceDesignMutationPayload & { modelKey?: string },
  ): Promise<VoiceDesignMutationResult> => {
    return await designVoiceMutation.mutateAsync(payload)
  }

  return (
    <VoiceDesignDialogBase
      isOpen={isOpen}
      speaker={speaker}
      hasExistingVoice={hasExistingVoice}
      onClose={onClose}
      onSave={onSave}
      onDesignVoice={handleDesignVoice}
      voiceDesignModels={voiceDesignModels}
    />
  )
}
