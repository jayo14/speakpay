import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder } from 'expo-audio'
import { useCallback, useRef, useState } from 'react'

const MIN_MS = 700
const MAX_MS = 15_000

/** Press-in starts recording, release stops it (PRD §8.2 Screen 2). Returns the .m4a uri. */
export function useHoldToTalk(onRecorded: (uri: string) => void) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY)
  const [recording, setRecording] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const startedAt = useRef(0)
  const maxTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stop = useCallback(async () => {
    if (maxTimer.current) clearTimeout(maxTimer.current)
    if (!recorder.isRecording) return
    await recorder.stop()
    setRecording(false)
    const held = Date.now() - startedAt.current
    if (held < MIN_MS || !recorder.uri) {
      setHint('Hold to speak')
      return
    }
    onRecorded(recorder.uri)
  }, [onRecorded, recorder])

  const start = useCallback(async () => {
    setHint(null)
    const perm = await requestRecordingPermissionsAsync()
    if (!perm.granted) {
      setHint('Microphone permission is required')
      return
    }
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })
    await recorder.prepareToRecordAsync()
    recorder.record()
    startedAt.current = Date.now()
    setRecording(true)
    maxTimer.current = setTimeout(() => void stop(), MAX_MS)
  }, [recorder, stop])

  return { recording, hint, start, stop }
}
