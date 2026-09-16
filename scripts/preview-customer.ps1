$ErrorActionPreference = "Stop"

$repoPath = Split-Path $PSScriptRoot -Parent
$workPath = Split-Path (Split-Path $repoPath -Parent) -Parent
$flutterPath = Join-Path $workPath "flutter-sdk"
$mobilePath = Join-Path $repoPath "mobile"

if (-not (Test-Path (Join-Path $flutterPath "bin\flutter.bat"))) {
  throw "Flutter SDK was not found at: $flutterPath"
}

cmd /c "subst N: /d" 2>$null | Out-Null
cmd /c "subst F: /d" 2>$null | Out-Null
cmd /c "subst N: `"$mobilePath`"" | Out-Null
cmd /c "subst F: `"$flutterPath`"" | Out-Null

$env:PUB_CACHE = "N:\.pub-cache"
$env:APPDATA = "N:\.preview-appdata"
$env:LOCALAPPDATA = "N:\.preview-localappdata"
New-Item -ItemType Directory -Force -Path $env:PUB_CACHE, $env:APPDATA, $env:LOCALAPPDATA | Out-Null
$apiBaseUrl = "http://127.0.0.1:3100"

$apiRunning = Test-NetConnection -ComputerName 127.0.0.1 -Port 3100 -InformationLevel Quiet -WarningAction SilentlyContinue
if (-not $apiRunning) {
  Start-Process -FilePath "npm.cmd" -ArgumentList @("run", "dev", "--", "-p", "3100") -WorkingDirectory $repoPath -WindowStyle Hidden
  Write-Host "Starting the local API..."
  Start-Sleep -Seconds 6
}

Set-Location "N:\"
& "F:\bin\flutter.bat" pub get
if ($LASTEXITCODE -ne 0) { throw "Flutter package installation failed." }
& "F:\bin\flutter.bat" run -d chrome --web-port 8080 --dart-define="API_BASE_URL=$apiBaseUrl"
if ($LASTEXITCODE -ne 0) { throw "Flutter preview failed to start." }
