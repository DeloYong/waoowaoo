'use client'

import { useCallback, useState } from 'react'
import { useTranslations } from 'next-intl'
import { isAbortError } from '@/lib/error-utils'
import { useCopyProjectAssetFromGlobal, useSaveAssetToGlobal } from '@/lib/query/hooks'

type ToastType = 'success' | 'warning' | 'error'

type ShowToast = (message: string, type?: ToastType, duration?: number) => void

export type GlobalCopyTarget = {
  type: 'character' | 'location' | 'prop' | 'voice'
  targetId: string
}

interface UseAssetsCopyFromHubParams {
  projectId: string
  onRefresh: () => void | Promise<void>
  showToast: ShowToast
}

const getErrorMessage = (error: unknown) => error instanceof Error ? error.message : String(error)

export function useAssetsCopyFromHub({ projectId, onRefresh, showToast }: UseAssetsCopyFromHubParams) {
  const t = useTranslations('assets')
  const copyFromGlobalAsset = useCopyProjectAssetFromGlobal(projectId)
  const saveToGlobalAsset = useSaveAssetToGlobal(projectId)
  const [copyFromGlobalTarget, setCopyFromGlobalTarget] = useState<GlobalCopyTarget | null>(null)
  const [isGlobalCopyInFlight, setIsGlobalCopyInFlight] = useState(false)
  const [savingAssetIds, setSavingAssetIds] = useState<Set<string>>(new Set())

  const handleCopyFromGlobal = useCallback((characterId: string) => {
    setCopyFromGlobalTarget({ type: 'character', targetId: characterId })
  }, [])

  const handleCopyLocationFromGlobal = useCallback((locationId: string) => {
    setCopyFromGlobalTarget({ type: 'location', targetId: locationId })
  }, [])

  const handleCopyPropFromGlobal = useCallback((propId: string) => {
    setCopyFromGlobalTarget({ type: 'prop', targetId: propId })
  }, [])

  const handleVoiceSelectFromHub = useCallback((characterId: string) => {
    setCopyFromGlobalTarget({ type: 'voice', targetId: characterId })
  }, [])

  const handleCloseCopyPicker = useCallback(() => {
    setCopyFromGlobalTarget(null)
  }, [])

  const handleConfirmCopyFromGlobal = useCallback(async (globalAssetId: string) => {
    if (!copyFromGlobalTarget) return

    setIsGlobalCopyInFlight(true)
    try {
      await copyFromGlobalAsset.mutateAsync({
        type: copyFromGlobalTarget.type,
        targetId: copyFromGlobalTarget.targetId,
        globalAssetId,
      })

      const successMsg = copyFromGlobalTarget.type === 'character'
        ? t('assetLibrary.copySuccessCharacter')
        : copyFromGlobalTarget.type === 'location'
          ? t('assetLibrary.copySuccessLocation')
          : copyFromGlobalTarget.type === 'prop'
            ? t('assetLibrary.copySuccessProp')
          : t('assetLibrary.copySuccessVoice')
      showToast(successMsg, 'success')
      setCopyFromGlobalTarget(null)
      await Promise.resolve(onRefresh())
    } catch (error: unknown) {
      if (!isAbortError(error)) {
        showToast(t('assetLibrary.copyFailed', { error: getErrorMessage(error) }), 'error')
      }
    } finally {
      setIsGlobalCopyInFlight(false)
    }
  }, [copyFromGlobalAsset, copyFromGlobalTarget, onRefresh, showToast, t])

  const isSavingToGlobal = useCallback((assetId: string): boolean => {
    return savingAssetIds.has(assetId)
  }, [savingAssetIds])

  const handleSaveToGlobal = useCallback(async (
    kind: 'character' | 'location' | 'prop' | 'voice',
    assetId: string,
  ) => {
    if (savingAssetIds.has(assetId)) return

    setSavingAssetIds((prev) => new Set(prev).add(assetId))
    try {
      await saveToGlobalAsset.mutateAsync({ kind, assetId })

      const successMsg = kind === 'character'
        ? t('assetLibrary.saveSuccessCharacter')
        : kind === 'location'
          ? t('assetLibrary.saveSuccessLocation')
          : kind === 'prop'
            ? t('assetLibrary.saveSuccessProp')
            : t('assetLibrary.saveSuccessVoice')
      showToast(successMsg, 'success')
    } catch (error: unknown) {
      if (!isAbortError(error)) {
        showToast(t('assetLibrary.saveFailed', { error: getErrorMessage(error) }), 'error')
      }
    } finally {
      setSavingAssetIds((prev) => {
        const next = new Set(prev)
        next.delete(assetId)
        return next
      })
    }
  }, [saveToGlobalAsset, savingAssetIds, showToast, t])

  return {
    copyFromGlobalTarget,
    isGlobalCopyInFlight,
    handleCopyFromGlobal,
    handleCopyLocationFromGlobal,
    handleCopyPropFromGlobal,
    handleVoiceSelectFromHub,
    handleConfirmCopyFromGlobal,
    handleCloseCopyPicker,
    handleSaveToGlobal,
    isSavingToGlobal,
  }
}
