# Tạo deploy\.env từ deploy\env.prod.example + appsettings.Development.json (chạy trên máy Windows).
# Cách dùng (từ thư mục gốc repo):
#   powershell -ExecutionPolicy Bypass -File deploy\scripts\make-env.ps1
# Sau đó gửi lên VPS:
#   scp -P 7180 deploy\.env root@103.178.235.226:/opt/tripops/deploy/.env

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$example = Join-Path $root 'deploy\env.prod.example'
$appsettings = Join-Path $root 'backend\src\TripOps.Api\appsettings.Development.json'
$out = Join-Path $root 'deploy\.env'

if (-not (Test-Path $appsettings)) { throw "Khong tim thay $appsettings" }
$cfg = Get-Content $appsettings -Raw -Encoding UTF8 | ConvertFrom-Json

function Get-Cfg([string]$path) {
    $node = $cfg
    foreach ($part in $path.Split(':')) {
        if ($null -eq $node) { return $null }
        $node = $node.$part
    }
    return $node
}

# Mật khẩu SA cho SQL Server trên VPS (nhập 2 lần, không hiện trên màn hình)
do {
    $p1 = Read-Host 'Dat mat khau SA cho SQL Server (>=10 ky tu, co HOA, thuong, so, ky tu !)' -AsSecureString
    $p2 = Read-Host 'Nhap lai' -AsSecureString
    $s1 = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($p1))
    $s2 = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($p2))
    $ok = $true
    if ($s1 -ne $s2) { Write-Host 'Hai lan nhap khong khop.' -ForegroundColor Red; $ok = $false }
    elseif ($s1.Length -lt 10 -or $s1 -cnotmatch '[A-Z]' -or $s1 -cnotmatch '[a-z]' -or $s1 -notmatch '[0-9]' -or $s1 -notmatch '[^A-Za-z0-9]') {
        Write-Host 'Mat khau qua yeu (can >=10 ky tu, co chu HOA, thuong, so va 1 ky tu dac biet nhu !).' -ForegroundColor Red; $ok = $false }
    elseif ($s1 -match "[;'`"`$``\s\\]") { Write-Host 'Khong dung cac ky tu ; '' " $ ` \ hoac dau cach.' -ForegroundColor Red; $ok = $false }
} until ($ok)

$values = @{
    'MSSQL_SA_PASSWORD'        = $s1
    'Cloudinary__CloudName'    = Get-Cfg 'Cloudinary:CloudName'
    'Cloudinary__ApiKey'       = Get-Cfg 'Cloudinary:ApiKey'
    'Cloudinary__ApiSecret'    = Get-Cfg 'Cloudinary:ApiSecret'
    'PayOs__ClientId'          = Get-Cfg 'PayOs:ClientId'
    'PayOs__ApiKey'            = Get-Cfg 'PayOs:ApiKey'
    'PayOs__ChecksumKey'       = Get-Cfg 'PayOs:ChecksumKey'
    'PayOsPayout__ClientId'    = Get-Cfg 'PayOsPayout:ClientId'
    'PayOsPayout__ApiKey'      = Get-Cfg 'PayOsPayout:ApiKey'
    'PayOsPayout__ChecksumKey' = Get-Cfg 'PayOsPayout:ChecksumKey'
    'OpenAI__ApiKey'           = Get-Cfg 'OpenAI:ApiKey'
}

$lines = foreach ($line in (Get-Content $example -Encoding UTF8)) {
    if ($line -match '^([A-Za-z0-9_]+)=(.*)$' -and $values.ContainsKey($Matches[1]) -and $values[$Matches[1]]) {
        "$($Matches[1])=$($values[$Matches[1]])"
    } else { $line }
}

# Ghi UTF-8 không BOM, xuống dòng kiểu Linux (LF)
[IO.File]::WriteAllText($out, (($lines -join "`n") + "`n"), (New-Object Text.UTF8Encoding $false))

Write-Host "`nDa tao $out" -ForegroundColor Green
$empty = $lines | Where-Object { $_ -match '^[A-Za-z0-9_]+=$' } | ForEach-Object { ($_ -split '=')[0] }
if ($empty) { Write-Host ('Con trong: ' + ($empty -join ', ')) -ForegroundColor Yellow } else { Write-Host 'Da dien du cac gia tri.' -ForegroundColor Green }
Write-Host "`nGui len VPS:`n  scp -P 7180 deploy\.env root@103.178.235.226:/opt/tripops/deploy/.env"
