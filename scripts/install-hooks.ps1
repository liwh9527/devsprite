# DevSprite Claude Code Hook Installer for Windows

$settingsPath = "$env:USERPROFILE\.claude\settings.json"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$hookScript = Join-Path $scriptDir "pipe-hook.ps1"

Write-Host "DevSprite Hook Installer" -ForegroundColor Cyan
Write-Host "Hook script: $hookScript"

# Backup existing settings
if (Test-Path $settingsPath) {
    $backupPath = "$settingsPath.backup.$(Get-Date -Format 'yyyyMMddHHmmss')"
    Copy-Item $settingsPath $backupPath
    Write-Host "Backed up settings to $backupPath" -ForegroundColor Yellow
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

# PreToolUse - fires before each tool call
$settings.hooks.PreToolUse = @(
    @{
        matcher = "*"
        hooks = @(
            @{
                type = "command"
                command = "powershell"
                args = @("-ExecutionPolicy", "Bypass", "-File", $hookScript, "-Event", "PreToolUse")
                timeout = 5
            }
        )
    }
)

# PostToolUse - fires after each tool call
$settings.hooks.PostToolUse = @(
    @{
        matcher = "*"
        hooks = @(
            @{
                type = "command"
                command = "powershell"
                args = @("-ExecutionPolicy", "Bypass", "-File", $hookScript, "-Event", "PostToolUse")
                timeout = 5
            }
        )
    }
)

# Notification - fires on notifications
$settings.hooks.Notification = @(
    @{
        matcher = "*"
        hooks = @(
            @{
                type = "command"
                command = "powershell"
                args = @("-ExecutionPolicy", "Bypass", "-File", $hookScript, "-Event", "Notification")
                timeout = 5
            }
        )
    }
)

# Stop - fires when Claude finishes responding
$settings.hooks.Stop = @(
    @{
        hooks = @(
            @{
                type = "command"
                command = "powershell"
                args = @("-ExecutionPolicy", "Bypass", "-File", $hookScript, "-Event", "Stop")
                timeout = 5
            }
        )
    }
)

# SessionStart - fires when session begins
$settings.hooks.SessionStart = @(
    @{
        hooks = @(
            @{
                type = "command"
                command = "powershell"
                args = @("-ExecutionPolicy", "Bypass", "-File", $hookScript, "-Event", "SessionStart")
                timeout = 5
            }
        )
    }
)

# Save settings
$settings | ConvertTo-Json -Depth 10 | Set-Content $settingsPath -Encoding UTF8
Write-Host ""
Write-Host "Hooks installed successfully!" -ForegroundColor Green
Write-Host "Installed hooks: PreToolUse, PostToolUse, Notification, Stop, SessionStart"
Write-Host ""
Write-Host "Restart Claude Code to activate hooks." -ForegroundColor Yellow
