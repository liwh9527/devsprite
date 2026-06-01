# DevSprite Claude Code Hook Installer for Windows
# - Idempotent: detects existing DevSprite hooks, skips if already installed
# - Non-destructive: appends to existing hooks, never overwrites other tools
# - Uses exe-relative paths for hook scripts

$settingsPath = "$env:USERPROFILE\.claude\settings.json"

# Resolve hook script path relative to this script's location (exe-relative)
$scriptDir = $PSScriptRoot
if (-not $scriptDir) {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
}
$hookScript = Join-Path $scriptDir "pipe-hook.ps1"
$hookScriptNorm = $hookScript.Replace('/', '\')

# Marker to identify DevSprite hook entries
$HOOK_MARKER = "pipe-hook.ps1"

Write-Host "DevSprite Hook Installer" -ForegroundColor Cyan
Write-Host "Hook script: $hookScript"

# Validate hook script exists
if (-not (Test-Path $hookScript)) {
    Write-Host "ERROR: Hook script not found at $hookScript" -ForegroundColor Red
    exit 1
}

# --- Helper: check if DevSprite hooks are already installed ---
function Test-DevSpriteHooksInstalled {
    param([hashtable]$Settings)

    if (-not $Settings.hooks) { return $false }

    foreach ($hookType in @("PreToolUse", "PostToolUse", "Notification", "Stop", "SessionStart", "PermissionRequest")) {
        $entries = $Settings.hooks[$hookType]
        if ($entries) {
            # Normalize to array (ConvertFrom-Json may return single hashtable)
            if ($entries -is [hashtable]) { $entries = @($entries) }
            foreach ($entry in $entries) {
                if ($entry.hooks) {
                    foreach ($h in $entry.hooks) {
                        if ($h.args -and ($h.args -join ' ') -match [regex]::Escape($HOOK_MARKER)) {
                            return $true
                        }
                    }
                }
            }
        }
    }
    return $false
}

# --- Read existing settings ---
$settings = @{}
if (Test-Path $settingsPath) {
    try {
        $settings = Get-Content $settingsPath -Raw | ConvertFrom-Json -AsHashtable
    } catch {
        Write-Host "WARNING: Failed to parse settings.json, starting fresh" -ForegroundColor Yellow
        $settings = @{}
    }
}

# --- Check if already installed (idempotent) ---
if (Test-DevSpriteHooksInstalled -Settings $settings) {
    Write-Host "DevSprite hooks already installed, skipping." -ForegroundColor Yellow
    exit 0
}

# --- Backup existing settings ---
if (Test-Path $settingsPath) {
    $backupPath = "$settingsPath.backup.$(Get-Date -Format 'yyyyMMddHHmmss')"
    Copy-Item $settingsPath $backupPath
    Write-Host "Backed up settings to $backupPath" -ForegroundColor Yellow
}

# --- Ensure hooks section exists ---
if (-not $settings.hooks) {
    $settings.hooks = @{}
}

# --- Helper: append a hook entry (never overwrite existing entries) ---
function Add-DevSpriteHook {
    param(
        [hashtable]$Settings,
        [string]$HookType,
        [hashtable]$Entry
    )

    if (-not $Settings.hooks[$HookType]) {
        $Settings.hooks[$HookType] = @()
    }

    # Ensure it's an array (ConvertFrom-Json may return a single hashtable)
    if ($Settings.hooks[$HookType] -is [hashtable]) {
        $Settings.hooks[$HookType] = @($Settings.hooks[$HookType])
    }

    # Check for duplicate by hook script path
    foreach ($existing in $Settings.hooks[$HookType]) {
        if ($existing.hooks) {
            foreach ($h in $existing.hooks) {
                if ($h.args -and ($h.args -join ' ') -match [regex]::Escape($HOOK_MARKER)) {
                    Write-Host "  $HookType hook already exists, skipping." -ForegroundColor DarkGray
                    return
                }
            }
        }
    }

    # Append DevSprite hook entry
    $Settings.hooks[$HookType] = @($Settings.hooks[$HookType]) + @($Entry)
    Write-Host "  + $HookType hook added." -ForegroundColor Green
}

# --- Build and install DevSprite hook entries ---
Add-DevSpriteHook -Settings $settings -HookType "PreToolUse" -Entry @{
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

Add-DevSpriteHook -Settings $settings -HookType "PostToolUse" -Entry @{
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

Add-DevSpriteHook -Settings $settings -HookType "Notification" -Entry @{
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

Add-DevSpriteHook -Settings $settings -HookType "Stop" -Entry @{
    hooks = @(
        @{
            type = "command"
            command = "powershell"
            args = @("-ExecutionPolicy", "Bypass", "-File", $hookScript, "-Event", "Stop")
            timeout = 5
        }
    )
}

Add-DevSpriteHook -Settings $settings -HookType "SessionStart" -Entry @{
    hooks = @(
        @{
            type = "command"
            command = "powershell"
            args = @("-ExecutionPolicy", "Bypass", "-File", $hookScript, "-Event", "SessionStart")
            timeout = 5
        }
    )
}

Add-DevSpriteHook -Settings $settings -HookType "PermissionRequest" -Entry @{
    matcher = "*"
    hooks = @(
        @{
            type = "command"
            command = "powershell"
            args = @("-ExecutionPolicy", "Bypass", "-File", $hookScript, "-Event", "PermissionRequest")
            timeout = 35
        }
    )
}

# --- Save ---
$settings | ConvertTo-Json -Depth 10 | Set-Content $settingsPath -Encoding UTF8
Write-Host ""
Write-Host "Hooks installed successfully!" -ForegroundColor Green
Write-Host "Installed hooks: PreToolUse, PostToolUse, Notification, Stop, SessionStart, PermissionRequest"
Write-Host ""
Write-Host "Restart Claude Code to activate hooks." -ForegroundColor Yellow
