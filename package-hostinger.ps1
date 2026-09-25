param(
  [string]$OutputPath = "d:\CyberJob_\ADMIN-BACKEND-HOSTINGER.zip"
)

$ErrorActionPreference = "Stop"

$repoDir = "d:\CyberJob_\admin-backend"
$stageDir = Join-Path $env:TEMP ("hostinger-admin-backend-" + [System.Guid]::NewGuid().ToString())

Write-Host "Compiling fresh NestJS production build for admin-backend..."
Push-Location $repoDir
npm run build
Pop-Location

Write-Host "Creating staging directory: $stageDir"
New-Item -ItemType Directory -Path $stageDir | Out-Null

if (Test-Path (Join-Path $repoDir "dist")) {
  Copy-Item -Recurse (Join-Path $repoDir "dist") (Join-Path $stageDir "dist")
}

if (Test-Path (Join-Path $repoDir "prisma")) {
  Copy-Item -Recurse (Join-Path $repoDir "prisma") (Join-Path $stageDir "prisma")
}

$files = @(
  "package.json",
  "package-lock.json",
  "nest-cli.json",
  "tsconfig.json"
)

foreach ($f in $files) {
  $srcFile = Join-Path $repoDir $f
  if (Test-Path $srcFile) {
    Copy-Item $srcFile (Join-Path $stageDir $f)
  }
}

if (Test-Path $OutputPath) {
  Remove-Item -Force $OutputPath
}

Write-Host "Compressing to $OutputPath..."
Compress-Archive -Path "$stageDir\*" -DestinationPath $OutputPath -CompressionLevel Optimal

Remove-Item -Recurse -Force $stageDir
Write-Host "Done: $OutputPath"
