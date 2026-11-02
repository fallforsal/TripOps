param(
    [string]$ApiBaseUrl = 'http://localhost:5080',
    [string]$AgencyEmail = 'agency@tripops.test',
    [string]$AgencyPassword = '12345678',
    [string]$GuidePassword = '12345678'
)

# Demo-only identities. Create through the API so passwords are hashed and
# users + guide_profiles are saved together under the authenticated Agency.
# Existing guides are skipped, never overwritten or reset to the demo password.
$ErrorActionPreference = 'Stop'
$ApiBaseUrl = $ApiBaseUrl.TrimEnd('/')
$guideSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
function Send-GuideJson([string]$Path, [object]$Body) {
    $json = $Body | ConvertTo-Json -Depth 10
    Invoke-RestMethod -Uri "$ApiBaseUrl/api/v1$Path" -Method Post -WebSession $guideSession `
        -ContentType 'application/json; charset=utf-8' -Body ([System.Text.Encoding]::UTF8.GetBytes($json)) -TimeoutSec 30
}
$null = Send-GuideJson '/auth/login' @{ email = $AgencyEmail; password = $AgencyPassword }
$existingGuides = @()
$guidePage = 1
do {
    $result = Invoke-RestMethod -Uri "$ApiBaseUrl/api/v1/agency/guides?page=$guidePage&pageSize=100" -WebSession $guideSession -TimeoutSec 30
    $existingGuides += @($result.items)
    $guidePage++
} while ($existingGuides.Count -lt $result.total -and @($result.items).Count -gt 0)

$profiles = @(
    @{
        name = 'Nguyễn Minh Khang'; email = 'guide01@tripops.test'; phone = '0900000101'; experienceYears = 5
        languages = @('Tiếng Việt', 'Tiếng Anh'); routes = @('Lâm Đồng', 'Khánh Hòa')
        specialties = @('Văn hóa – Lịch sử', 'Khách đoàn doanh nghiệp (MICE)')
    },
    @{
        name = 'Trần Thảo Linh'; email = 'guide02@tripops.test'; phone = '0900000102'; experienceYears = 3
        languages = @('Tiếng Việt', 'Tiếng Anh', 'Tiếng Hàn'); routes = @('Lâm Đồng')
        specialties = @('Ẩm thực & Nghỉ dưỡng', 'Chăm sóc khách hàng')
    },
    @{
        name = 'Lê Hoàng Nam'; email = 'guide03@tripops.test'; phone = '0900000103'; experienceYears = 7
        languages = @('Tiếng Việt', 'Tiếng Pháp'); routes = @('Lâm Đồng', 'Đắk Lắk')
        specialties = @('Trekking & Khám phá thiên nhiên', 'Thuyết minh di sản')
    },
    @{
        name = 'Phạm Ngọc Mai'; email = 'guide04@tripops.test'; phone = '0900000104'; experienceYears = 2
        languages = @('Tiếng Việt', 'Tiếng Trung'); routes = @('Lâm Đồng')
        specialties = @('Văn hóa – Lịch sử', 'Chăm sóc khách hàng')
    },
    @{
        name = 'Đỗ Quốc Huy'; email = 'guide05@tripops.test'; phone = '0900000105'; experienceYears = 4
        languages = @('Tiếng Việt', 'Tiếng Anh'); routes = @('Lâm Đồng', 'Ninh Thuận')
        specialties = @('MC Gala Dinner & Teambuilding', 'Khách đoàn doanh nghiệp (MICE)')
    }
)
$createdCount = 0
$skippedCount = 0
foreach ($profile in $profiles) {
    if ($existingGuides | Where-Object { $_.email -eq $profile.email }) {
        $skippedCount++
        continue
    }
    $profile.bio = '[Dữ liệu mẫu HDV] Hồ sơ, số điện thoại, ngôn ngữ và kinh nghiệm giả lập để kiểm thử quản lý nhân sự, phân công tour. Không phải thông tin của một HDV thật.'
    $profile.avatar = $null
    $guide = Send-GuideJson '/agency/guides' @{ profile = $profile; password = $GuidePassword }
    if ($guide.role -ne 'guide' -or $guide.mobileAccountStatus -ne 'active') {
        throw "Unexpected guide response for $($profile.email)"
    }
    $createdCount++
}
[pscustomobject]@{ Created = $createdCount; Skipped = $skippedCount; Agency = $AgencyEmail }
