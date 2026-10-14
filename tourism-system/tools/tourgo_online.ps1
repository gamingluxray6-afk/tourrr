param(
    [ValidateSet('start', 'stop', 'remove-autostart')] [string]$Mode = 'start',
    [switch]$Hidden
)

$cloudflared = (Get-Command cloudflared -ErrorAction SilentlyContinue).Source
if (-not $cloudflared) { $cloudflared = 'C:\Program Files (x86)\cloudflared\cloudflared.exe' }
$metrics    = '127.0.0.1:46333'
$xamppStart = 'C:\xampp\xampp_start.exe'
$site       = Split-Path $PSScriptRoot -Parent
$config     = Join-Path $site 'api\config.php'
$linkFile   = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Tourgo link.txt'
$stopFlag   = Join-Path $env:TEMP 'tourgo-online-stop.flag'
$startupVbs = Join-Path ([Environment]::GetFolderPath('Startup')) 'Tourgo Online.vbs'

function Say($text, $color = 'White') { if (-not $Hidden) { Write-Host $text -ForegroundColor $color } }
function Pause-Exit($code) { if (-not $Hidden) { Write-Host ''; Read-Host 'Press Enter to close' | Out-Null }; exit $code }
function Test-Port($port) {
    try { $c = New-Object Net.Sockets.TcpClient; $c.Connect('127.0.0.1', $port); $c.Close(); return $true } catch { return $false }
}
function Get-Tunnels {
    Get-CimInstance Win32_Process -Filter "Name='cloudflared.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -match 'tunnel\s+--url' }
}
function Set-BaseUrl($url) {
    $t = [IO.File]::ReadAllText($config)
    $t = [regex]::Replace($t, "define\('APP_BASE_URL',\s*'[^']*'\);", "define('APP_BASE_URL', '$url');")
    [IO.File]::WriteAllText($config, $t, (New-Object Text.UTF8Encoding $false))
}

if (-not (Test-Path $cloudflared)) { Say 'cloudflared was not found. Install it from https://github.com/cloudflare/cloudflared/releases' 'Red'; Pause-Exit 1 }

if ($Mode -eq 'stop') {
    Set-Content -Path $stopFlag -Value 'stop' -Encoding ASCII
    $t = Get-Tunnels
    $t | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    Set-BaseUrl ''
    if ($t) { Say 'LakbayNaguilian is now OFFLINE (the Cloudflare link was stopped).' 'Yellow' } else { Say 'The Cloudflare link was not running.' 'Yellow' }
    Pause-Exit 0
}

if ($Mode -eq 'remove-autostart') {
    if (Test-Path $startupVbs) { Remove-Item $startupVbs -Force; Say 'LakbayNaguilian will no longer go online by itself when Windows starts.' 'Yellow' }
    else { Say 'Auto start was not set up.' }
    Pause-Exit 0
}

Remove-Item $stopFlag -ErrorAction SilentlyContinue

if (-not (Test-Path $startupVbs)) {
    $ps1 = Join-Path $PSScriptRoot 'tourgo_online.ps1'
    $vbs = 'CreateObject("WScript.Shell").Run "powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""' + $ps1 + '"" -Mode start -Hidden", 0, False'
    Set-Content -Path $startupVbs -Value $vbs -Encoding ASCII
    Say 'LakbayNaguilian will also go online by itself every time you log in to Windows.' 'Cyan'
}

if (-not (Test-Port 8080) -or -not (Test-Port 3306)) {
    Say 'Starting XAMPP (Apache + MySQL)...'
    if (Test-Path $xamppStart) { Start-Process $xamppStart -WindowStyle Minimized }
    for ($i = 0; $i -lt 45 -and -not ((Test-Port 8080) -and (Test-Port 3306)); $i++) { Start-Sleep -Seconds 2 }
    if (-not (Test-Port 8080)) { Say 'Apache is not answering on port 8080. Open the XAMPP Control Panel and press Start on Apache.' 'Red'; Pause-Exit 1 }
    if (-not (Test-Port 3306)) { Say 'MySQL is not running. Open the XAMPP Control Panel and press Start on MySQL.' 'Red'; Pause-Exit 1 }
}

Get-Tunnels | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue; Say 'Stopped an older Cloudflare link.' 'Yellow' }

while ($true) {
    Say ''
    Say 'Opening the Cloudflare link...'
    $proc = Start-Process $cloudflared -ArgumentList 'tunnel', '--url', 'http://127.0.0.1:8080', '--protocol', 'http2', '--metrics', $metrics -WindowStyle Hidden -PassThru
    $hostName = $null
    for ($i = 0; $i -lt 40 -and -not $hostName -and -not $proc.HasExited; $i++) {
        Start-Sleep -Seconds 2
        try { $hostName = (Invoke-RestMethod "http://$metrics/quicktunnel" -TimeoutSec 3).hostname } catch {}
    }
    if ($hostName) {
        $url = "https://$hostName"
        Set-BaseUrl $url
        Set-Content -Path $linkFile -Encoding ASCII -Value @(
            'LakbayNaguilian is online at:', '', $url, '',
            "Started: $(Get-Date -Format 'yyyy-MM-dd HH:mm')",
            'This address changes every time the link restarts. QR codes made from now on use it.')
        try { Set-Clipboard -Value $url } catch {}
        Say ''
        Say '==============================================================' 'Green'
        Say "  LakbayNaguilian is ONLINE:  $url" 'Green'
        Say '==============================================================' 'Green'
        Say '  - Works on any Wi-Fi or mobile data. The link is copied, just paste it.'
        Say '  - Also saved on your Desktop in "Tourgo link.txt".'
        Say '  - QR codes made from now on open this link.'
        Say '  - Keep the PC on. Keep this window open so the link restarts by itself if it drops.'
        Say '  - To go offline run 2_STOP_ONLINE.bat.'
        Say ''
        while (-not $proc.HasExited -and -not (Test-Path $stopFlag)) { Start-Sleep -Seconds 5 }
    } else {
        Say 'Could not get a Cloudflare link (is the internet on?).' 'Red'
        if (-not $proc.HasExited) { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue }
    }
    if (Test-Path $stopFlag) { Remove-Item $stopFlag -ErrorAction SilentlyContinue; break }
    Say 'The link stopped. Starting a new one in 10 seconds (the address will change)...' 'Yellow'
    Start-Sleep -Seconds 10
}
