import * as LocalAuthentication from 'expo-local-authentication'

/** True when the phone has a fingerprint/face sensor with something enrolled. */
export async function biometricsAvailable() {
  try {
    return (await LocalAuthentication.hasHardwareAsync()) && (await LocalAuthentication.isEnrolledAsync())
  } catch {
    return false
  }
}

export async function biometricUnlock(prompt = 'Unlock SpeakPay') {
  try {
    const r = await LocalAuthentication.authenticateAsync({ promptMessage: prompt, cancelLabel: 'Use PIN', disableDeviceFallback: true })
    return r.success
  } catch {
    return false
  }
}
