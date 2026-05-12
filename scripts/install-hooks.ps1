# DevSprite Claude Code Hook Installer for Windows

$settingsPath = "$env:USERPROFILE\.claude\settings.json"
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$bridgePath = Join-Path $scriptPath "devsprite-bridge.cmd"

# Backup existing settings
if (Test-Path $settingsPath) {
    $backupPath = "$settingsPath.backup.$(Get-Date -Format 'yyyyMMddHHmmss')"
    Copy-Item $settingsPath $backupPath
    Write-Host "Backed up settings to $backupPath"
}

# Read existing settings or create new
$settings = @{}
if (Test-Path $settingsPath) {
    $settings = Get-Content $settingsPath -Raw | ConvertFrom-Json -AsHashtable
}

# Add hooks
if (-not $settings.hooks) {
    $settings.hooks = @{}
}

$settings.hooks.PostToolUse = @(
    @{
        matcher = ""
        hooks = @(
            @{
                type = "command"
                command = "$bridgePath tool_call --data `"$TOOL_INPUT`""
            }
        )
    }
)

$settings.hooks.Notification = @(
    @{
        matcher = ""
        hooks = @(
            @{
                type = "command"
                command = "$bridgePath notification --data `"$MESSAGE`""
            }
        )
    }
)

# Save settings
$settings | ConvertTo-Json -Depth 10 | Set-Content $settingsPath
Write-Host "Claude Code hooks installed successfully!"
Write-Host "Bridge path: $bridgePath"
