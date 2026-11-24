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

export const isNativeApp = isNative;
