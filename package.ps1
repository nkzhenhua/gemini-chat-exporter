# Create distribution package for Chrome Web Store

# Create dist directory
New-Item -ItemType Directory -Force -Path .\dist | Out-Null

# List of files to include in the package
$filesToCopy = @(
    "manifest.json",
    "background.js",
    "content.js",
    "popup.html",
    "popup.js",
    "popup.css",
    "favicon-16x16.png",
    "favicon-16x16-grayscale.png",
    "android-icon-48x48.png",
    "android-icon-48x48-grayscale.png",
    "android-icon-144x144.png",
    "android-icon-144x144-grayscale.png"
)

# Copy files to dist
Write-Host "Copying files to dist/..." -ForegroundColor Green
foreach ($file in $filesToCopy) {
    if (Test-Path $file) {
        Copy-Item $file .\dist\ -Force
        Write-Host "  ✓ $file" -ForegroundColor Gray
    } else {
        Write-Host "  ✗ Warning: $file not found" -ForegroundColor Yellow
    }
}

# Create zip file
$version = (Get-Content manifest.json | ConvertFrom-Json).version
$zipName = "gemini-exporter-v$version.zip"

Write-Host "`nCreating zip package..." -ForegroundColor Green
if (Test-Path $zipName) {
    Remove-Item $zipName -Force
}

Compress-Archive -Path .\dist\* -DestinationPath $zipName -Force

Write-Host "✓ Package created: $zipName" -ForegroundColor Green

# Show package info
$zipSize = (Get-Item $zipName).Length / 1KB
Write-Host "`nPackage size: $($zipSize.ToString('F2')) KB" -ForegroundColor Cyan

Write-Host "`n✓ Done! Upload $zipName to Chrome Web Store" -ForegroundColor Green
