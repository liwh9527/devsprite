# DevSprite Claude Code Hook Uninstaller for Windows
# - Only removes DevSprite hooks (identified by pipe-hook.ps1 marker)
# - Preserves all other tools' hooks (non-destructive)

$settingsPath = "$env:USERPROFILE\.claude\settings.json"

# Marker to identify DevSprite hook entries
$HOOK_MARKER = "pipe-hook.ps1"

Write-Host "DevSprite Hook Uninstaller" -ForegroundColor Cyan

# --- Read existing settings ---
if (-not (Test-Path $settingsPath)) {
    Write-Host "No settings.json found at $settingsPath" -ForegroundColor Yellow
    Write-Host "Nothing to uninstall."
    exit 0
}

$settings = @{}
try {
    $settings = Get-Content $settingsPath -Raw | ConvertFrom-Json -AsHashtable
} catch {
    Write-Host "ERROR: Failed to parse $settingsPath" -ForegroundColor Red
    exit 1
}

if (-not $settings.hooks) {
    Write-Host "No hooks section found in settings.json" -ForegroundColor Yellow
    Write-Host "Nothing to uninstall."
    exit 0
}

# --- Backup ---
$backupPath = "$settingsPath.backup.$(Get-Date -Format 'yyyyMMddHHmmss')"
Copy-Item $settingsPath $backupPath
Write-Host "Backed up settings to $backupPath" -ForegroundColor Yellow

# --- Remove DevSprite hooks from each hook type ---
$hookTypes = @("PreToolUse", "PostToolUse", "Notification", "Stop", "SessionStart", "PermissionRequest")
$removedCount = 0

foreach ($hookType in $hookTypes) {
    $entries = $settings.hooks[$hookType]
    if (-not $entries) { continue }

    # Normalize to array
    if ($entries -is [hashtable]) { $entries = @($entries) }

    $filteredEntries = @()
    foreach ($entry in $entries) {
        $isDevSprite = $false

        if ($entry.hooks) {
            foreach ($h in $entry.hooks) {
                if ($h.args -and ($h.args -join ' ') -match [regex]::Escape($HOOK_MARKER)) {
                    $isDevSprite = $true
                    break
                }
            }
        }

        if ($isDevSprite) {
            $removedCount++
            Write-Host "  - Removed $hookType hook." -ForegroundColor Yellow
        } else {
            $filteredEntries += $entry
        }
    }

    # Update or remove the hook type
    if ($filteredEntries.Count -eq 0) {
        $settings.hooks.Remove($hookType)
        Write-Host "  - $hookType section removed (empty)." -ForegroundColor DarkGray
    } else {
        $settings.hooks[$hookType] = $filteredEntries
    }
}

# --- Save ---
if ($removedCount -eq 0) {
    Write-Host ""
    Write-Host "No DevSprite hooks found in settings.json." -ForegroundColor Yellow
    Write-Host "Nothing was changed."
    # Remove the unnecessary backup
    Remove-Item $backupPath -Force -ErrorAction SilentlyContinue
    exit 0
}

$settings | ConvertTo-Json -Depth 10 | Set-Content $settingsPath -Encoding UTF8
Write-Host ""
Write-Host "Hooks uninstalled successfully!" -ForegroundColor Green
Write-Host "Removed $removedCount DevSprite hook entry/entries."
Write-Host ""
Write-Host "Restart Claude Code to apply changes." -ForegroundColor Yellow
