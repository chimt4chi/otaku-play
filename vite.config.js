import fs from 'node:fs'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The web build links to /assets/OtakuPlay.apk (copied from /public). The Android app
// itself has no use for that file, and shipping it would embed a full APK inside every APK.
function stripApkFromNativeBuild() {
  let outDir = ''
  return {
    name: 'strip-apk-from-native-build',
    apply: 'build',
    configResolved(config) {
      outDir = path.resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      fs.rmSync(path.join(outDir, 'assets', 'OtakuPlay.apk'), { force: true })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), mode === 'native' && stripApkFromNativeBuild()],
}))
