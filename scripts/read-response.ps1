# DevSprite Response Reader - Called by Claude Code hooks to check permission responses
# Usage: .\read-response.ps1 -RequestId <request_id> -Timeout <seconds>

param(
    [string]$RequestId = "",
    [int]$Timeout = 30
)

$responseFile = Join-Path $env:APPDATA "devsprite\responses.json"
$startTime = Get-Date

while ($true) {
    # Check timeout
    $elapsed = (Get-Date) - $startTime
    if ($elapsed.TotalSeconds -ge $Timeout) {
        Write-Output '{"approved": false, "reason": "timeout"}'
        exit 0
    }

    # Check if response file exists
    if (Test-Path $responseFile) {
        try {
            $responses = Get-Content $responseFile | ConvertFrom-Json

            foreach ($response in $responses) {
                if ($response.request_id -eq $RequestId) {
                    $result = @{
                        approved = $response.approved
                        timestamp = $response.timestamp
                    }
                    Write-Output ($result | ConvertTo-Json -Compress)
                    exit 0
                }
            }
        }
        catch {
            # Ignore parse errors
        }
    }

    # Wait before retrying
    Start-Sleep -Milliseconds 500
}

Write-Output '{"approved": false, "reason": "not_found"}'
