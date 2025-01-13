param (
    [string]$pathIn
)

if ($pathIn -notmatch "\.ts$") {
    $filePath = "$pathIn.ts"
} else {
    $filePath = $pathIn
}

Write-Host "Transpiling" -NoNewline
Write-Host " $($filePath.Trim())" -ForegroundColor Yellow -NoNewline
Write-Host " to JavaScript."
npx tsc $filePath

$jsFilePath = [System.IO.Path]::ChangeExtension($filePath, '.js')
Write-Host "Done. Running" -NoNewline
Write-Host " $($jsFilePath.Trim())" -ForegroundColor Yellow -NoNewline
Write-Host "."
node $jsFilePath