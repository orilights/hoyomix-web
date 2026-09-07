import { usePlayerStore } from '@/store/player'
import { usePlayerCoverColors } from './usePlayerCoverColors'

export function useSpectrumColor() {
  const player = usePlayerStore()
  const { accent } = usePlayerCoverColors()
  return computed(() => player.spectrumSettings.colorMode === 'cover' ? accent.value : player.spectrumSettings.color)
}
