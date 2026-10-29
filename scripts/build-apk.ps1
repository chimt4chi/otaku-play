$ErrorActionPreference = "Stop"

if (-not $env:JAVA_HOME -or ($env:JAVA_HOME -like "*17*")) {
    if (Test-Path "C:\Program Files\Microsoft\jdk-21.0.12.101-hotspot") {
        $env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-21.0.12.101-hotspot"
        Write-Host "Set JAVA_HOME to Java 21: $env:JAVA_HOME"
    } elseif (Test-Path "C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot") {
        $env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot"
        Write-Host "Set JAVA_HOME to: $env:JAVA_HOME"
    }
}

Write-Host "==> Building web assets..."
npm run build

Write-Host "==> Syncing Capacitor with Android..."
npx cap sync android

Write-Host "==> Compiling Android APK with Gradle..."
Push-Location android
try {
    .\gradlew.bat assembleDebug
    if ($LASTEXITCODE -ne 0) {
        throw "Gradle build failed with exit code $LASTEXITCODE"
    }
} finally {
    Pop-Location
}

$sourceApk = "android\app\build\outputs\apk\debug\app-debug.apk"
$targetApk = "OtakuPlay.apk"

if (Test-Path $sourceApk) {
    Copy-Item -Path $sourceApk -Destination $targetApk -Force
    $sizeMb = [math]::Round(((Get-Item $targetApk).Length / 1MB), 2)
    Write-Host "==> SUCCESS! Dedicated Android APK created: $targetApk ($sizeMb MB)"
} else {
    Write-Error "APK compilation output not found at: $sourceApk"
}
