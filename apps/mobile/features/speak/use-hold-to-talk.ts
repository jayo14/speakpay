import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from 'expo-audio'
import { useCallback, useRef, useState } from 'react'

const MIN_MS = 700
const MAX_MS = 15_000

/**
 * Press-in starts recording, release stops it. `level` (0..1) is the live microphone volume,
 * from expo-audio metering, used to drive the voice waves around the orb.
 */
export function useHoldToTalk(onRecorded: (uri: string) => void) {
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true })
  const state = useAudioRecorderState(recorder, 80)
  const [recording, setRecording] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const startedAt = useRef(0)
  const maxTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stop = useCallback(async () => {
    if (maxTimer.current) clearTimeout(maxTimer.current)
    if (!recorder.isRecording) return
    await recorder.stop()
    setRecording(false)
    if (Date.now() - startedAt.current < MIN_MS || !recorder.uri) {
      setHint('Hold a little longer while you speak.')
      return
    }
    onRecorded(recorder.uri)
  }, [onRecorded, recorder])

  const start = useCallback(async () => {
    setHint(null)
    const perm = await requestRecordingPermissionsAsync()
    if (!perm.granted) {
      setHint('Allow microphone access to speak to pay.')
      return
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })
    await recorder.prepareToRecordAsync()
    recorder.record()
    startedAt.current = Date.now()
    setRecording(true)
    maxTimer.current = setTimeout(() => void stop(), MAX_MS)
  }, [recorder, stop])

  // metering is in dBFS (about -60 quiet … 0 loud)
  const db = recording && typeof state.metering === 'number' ? state.metering : -160
  const level = Math.max(0, Math.min(1, (db + 55) / 50))
  return { recording, hint, start, stop, level }
}
