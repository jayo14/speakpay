import { createAudioPlayer, setAudioModeAsync } from 'expo-audio'
import { File, Paths } from 'expo-file-system'

/** Plays a base64 MP3 from /api/* (ElevenLabs TTS) by writing it to the cache dir. */
export async function playTts(base64: string | null): Promise<void> {
  if (!base64) return
  const file = new File(Paths.cache, `speakpay-tts-${Date.now()}.mp3`)
  file.write(base64, { encoding: 'base64' })
  await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true })
  const player = createAudioPlayer({ uri: file.uri })
  const sub = player.addListener('playbackStatusUpdate', (s) => {
    if (s.didJustFinish) {
      sub.remove()
      player.release()
      try {
        file.delete()
      } catch {
        // cache cleanup is best-effort
      }
    }
  })
  player.play()
}
