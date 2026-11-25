import { Capacitor, registerPlugin } from '@capacitor/core';

// Custom Android plugin (PlayerNativePlugin.java). Every call is a no-op on the web.
const PlayerNative = registerPlugin('PlayerNative');
const isNative = Capacitor.isNativePlatform();

/** Immersive mode + landscape lock + keep-awake for fullscreen playback. */
export function setNativeFullscreen(enabled) {
  if (!isNative) return Promise.resolve();
  return PlayerNative.setFullscreen({ enabled }).catch(() => {});
}

/** Keeps the screen on while the player screen is open. */
export function setKeepAwake(enabled) {
  if (!isNative) return Promise.resolve();
  return PlayerNative.setKeepAwake({ enabled }).catch(() => {});
}

/** True on Android TV / Google TV. Always false on the web. */
export function queryIsTv() {
  if (!isNative) return Promise.resolve(false);
  return PlayerNative.getDeviceInfo().then(r => Boolean(r?.isTv)).catch(() => false);
}

export const isNativeApp = isNative;
