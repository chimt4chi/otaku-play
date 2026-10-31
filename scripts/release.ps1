param(
    [Parameter(Mandatory=$false)]
    [string]$Version = ""
)

$ErrorActionPreference = "Stop"

$pkgPath = "package.json"
$pkgJson = Get-Content $pkgPath -Raw | ConvertFrom-Json
$currentVer = $pkgJson.version

if (-not $Version) {
    Write-Host "Current version is: $currentVer"
    $Version = Read-Host "Enter new release version (e.g. 1.0.0)"
}

if (-not $Version) {
    Write-Error "Version is required to create a release."
    exit 1
}

$tag = if ($Version.StartsWith("v")) { $Version } else { "v$Version" }
$rawVer = if ($Version.StartsWith("v")) { $Version.Substring(1) } else { $Version }

Write-Host "==> Bumping version to $rawVer (Tag: $tag)..."

# 1. Update package.json
$pkgJson.version = $rawVer
$pkgJson | ConvertTo-Json -Depth 10 | Set-Content $pkgPath

# 2. Update android/app/build.gradle
$gradlePath = "android/app/build.gradle"
if (Test-Path $gradlePath) {
    $gradleContent = Get-Content $gradlePath -Raw
    if ($gradleContent -match 'versionCode (\d+)') {
        $oldCode = [int]$matches[1]
        $newCode = $oldCode + 1
        $gradleContent = $gradleContent -replace "versionCode \d+", "versionCode $newCode"
    }
    $gradleContent = $gradleContent -replace 'versionName "[^"]+"', "versionName `"$rawVer`""
    Set-Content -Path $gradlePath -Value $gradleContent
}

# 3. Build Web & Android APK
Write-Host "==> Compiling Android APK..."
npm run build:apk

# 4. Git Commit & Tag
Write-Host "==> Creating Git Commit and Tag $tag..."
git add package.json android/app/build.gradle OtakuPlay.apk public/assets/OtakuPlay.apk
git commit -m "chore(release): $tag"
git tag -a $tag -m "Release $tag"

Write-Host "==> Pushing commit and tag $tag to GitHub..."
git push origin main
git push origin $tag

Write-Host "`n==> SUCCESS! Release $tag pushed to GitHub."
Write-Host "GitHub Actions will automatically publish the release at:"
Write-Host "https://github.com/chimt4chi/otaku-play/releases/tag/$tag"

