Add-Type -AssemblyName System.Drawing

$sourcePath = "C:\Users\Rohit Singh\.gemini\antigravity\brain\b7684bb3-5dff-46f9-a29e-aac199631b3a\otakuplay_app_icon_1795267471555.jpg"
if (-not (Test-Path $sourcePath)) {
    Write-Error "Source image not found at $sourcePath"
    exit 1
}

$sourceImg = [System.Drawing.Image]::FromFile($sourcePath)

function Resize-Image {
    param(
        [System.Drawing.Image]$img,
        [int]$width,
        [int]$height,
        [string]$outputPath,
        [bool]$round = $false,
        [float]$scaleInner = 1.0
    )

    $destBmp = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($destBmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    if ($round) {
        $path = New-Object System.Drawing.Drawing2D.GraphicsPath
        $path.AddEllipse(0, 0, $width, $height)
        $g.SetClip($path)
    }

    if ($scaleInner -ne 1.0) {
        $innerW = [int]($width * $scaleInner)
        $innerH = [int]($height * $scaleInner)
        $offsetX = [int](($width - $innerW) / 2)
        $offsetY = [int](($height - $innerH) / 2)
        $g.DrawImage($img, $offsetX, $offsetY, $innerW, $innerH)
    } else {
        $g.DrawImage($img, 0, 0, $width, $height)
    }

    $g.Dispose()
    
    $dir = Split-Path -Parent $outputPath
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }

    $destBmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $destBmp.Dispose()
    Write-Host "Created: $outputPath (${width}x${height})"
}

$densities = @(
    @{ Name = "mipmap-mdpi"; Size = 48; FgSize = 108 },
    @{ Name = "mipmap-hdpi"; Size = 72; FgSize = 162 },
    @{ Name = "mipmap-xhdpi"; Size = 96; FgSize = 216 },
    @{ Name = "mipmap-xxhdpi"; Size = 144; FgSize = 324 },
    @{ Name = "mipmap-xxxhdpi"; Size = 192; FgSize = 432 }
)

$resDir = "android\app\src\main\res"

foreach ($d in $densities) {
    $folder = Join-Path $resDir $d.Name
    
    # Standard launcher icon
    $launcherPath = Join-Path $folder "ic_launcher.png"
    Resize-Image -img $sourceImg -width $d.Size -height $d.Size -outputPath $launcherPath

    # Round launcher icon
    $roundPath = Join-Path $folder "ic_launcher_round.png"
    Resize-Image -img $sourceImg -width $d.Size -height $d.Size -outputPath $roundPath -round $true

    # Adaptive foreground (padded so the icon emblem fits in the 72dp safe area of the 108dp adaptive canvas)
    $fgPath = Join-Path $folder "ic_launcher_foreground.png"
    Resize-Image -img $sourceImg -width $d.FgSize -height $d.FgSize -outputPath $fgPath -scaleInner 0.72
}

# Public web assets
Resize-Image -img $sourceImg -width 512 -height 512 -outputPath "public\icon-512.png"
Resize-Image -img $sourceImg -width 192 -height 192 -outputPath "public\icon-192.png"
Resize-Image -img $sourceImg -width 1024 -height 1024 -outputPath "public\app-icon.png"

$sourceImg.Dispose()
Write-Host "All icons generated successfully!"
