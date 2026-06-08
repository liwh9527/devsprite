# DevSprite Claude Code Hook - Reads stdin and sends to Named Pipe
# Called by Claude Code hooks (PreToolUse, PostToolUse, Notification, etc.)
#
# For PermissionRequest events, uses bidirectional pipe communication:
#   sends the request, waits for user response, outputs result to stdout.
# For all other events, uses fire-and-forget (write-only pipe).

param(
    [string]$Event = ""
)

# Read the full JSON payload from stdin
$stdin = [Console]::In.ReadToEnd()
$input = $stdin | ConvertFrom-Json

# Map Claude Code hook events to DevSprite events
$devspriteEvent = "status_change"

# Session ID: prefer stdin > env var > generate new
$sessionId = $input.session_id
if (-not $sessionId) {
    $sessionId = $env:CLAUDE_CODE_SESSION_ID
}
if (-not $sessionId) {
    $sessionId = [guid]::NewGuid().ToString()
}
$data = @{}
$isBlocking = $false

switch ($Event) {
    "PreToolUse" {
        $devspriteEvent = "tool_call"
        $toolInput = $input.tool_input
        $detail = ""
        switch ($input.tool_name) {
            "Bash" { $detail = if ($toolInput.command) { $toolInput.command } else { "" } }
            "Edit" { $detail = if ($toolInput.old_string) { "Old: $($toolInput.old_string)`nNew: $($toolInput.new_string)" } else { "" } }
            "Write" { $detail = if ($toolInput.content) { $toolInput.content.Substring(0, [Math]::Min(200, $toolInput.content.Length)) } else { "" } }
            "Read" { $detail = if ($toolInput.file_path) { $toolInput.file_path } else { "" } }
            "Grep" { $detail = if ($toolInput.pattern) { $toolInput.pattern } else { "" } }
            "Glob" { $detail = if ($toolInput.pattern) { $toolInput.pattern } else { "" } }
        }
        $data = @{
            tool_name = if ($input.tool_name) { $input.tool_name } else { "" }
            file_path = if ($toolInput.file_path) { $toolInput.file_path } else { "" }
            status = "pending"
            detail = $detail
        }
    }
    "PostToolUse" {
        $devspriteEvent = "tool_call"
        $toolInput = $input.tool_input
        $detail = ""
        switch ($input.tool_name) {
            "Bash" { $detail = if ($toolInput.command) { $toolInput.command } else { "" } }
            "Edit" { $detail = if ($toolInput.old_string) { "Old: $($toolInput.old_string)`nNew: $($toolInput.new_string)" } else { "" } }
            "Write" { $detail = if ($toolInput.content) { $toolInput.content.Substring(0, [Math]::Min(200, $toolInput.content.Length)) } else { "" } }
            "Read" { $detail = if ($toolInput.file_path) { $toolInput.file_path } else { "" } }
            "Grep" { $detail = if ($toolInput.pattern) { $toolInput.pattern } else { "" } }
            "Glob" { $detail = if ($toolInput.pattern) { $toolInput.pattern } else { "" } }
        }
        $data = @{
            tool_name = if ($input.tool_name) { $input.tool_name } else { "" }
            file_path = if ($toolInput.file_path) { $toolInput.file_path } else { "" }
            status = "completed"
            detail = $detail
        }
    }
    "Notification" {
        $devspriteEvent = "status_change"
        $notifType = if ($input.notification_type) { $input.notification_type } else { "info" }
        $data = @{
            status = "waiting"
            message = "Notification: $notifType"
        }
    }
    "Stop" {
        $devspriteEvent = "session_end"
        $data = @{}
    }
    "SessionStart" {
        $devspriteEvent = "session_start"
        $data = @{}
    }
    "UserPromptSubmit" {
        $devspriteEvent = "user_prompt"
        $data = @{
            prompt = if ($input.prompt) { $input.prompt.Substring(0, [Math]::Min(200, $input.prompt.Length)) } else { "" }
        }
    }
    "PostToolUseFailure" {
        $devspriteEvent = "tool_call"
        $data = @{
            tool_name = if ($input.tool_name) { $input.tool_name } else { "" }
            file_path = if ($input.tool_input.file_path) { $input.tool_input.file_path } else { "" }
            status = "failed"
            error = if ($input.error) { $input.error.Substring(0, [Math]::Min(200, $input.error.Length)) } else { "" }
        }
    }
    "SubagentStart" {
        $devspriteEvent = "subagent_start"
        $data = @{
            agent_id = if ($input.agent_id) { $input.agent_id } else { "" }
        }
    }
    "SubagentStop" {
        $devspriteEvent = "subagent_stop"
        $data = @{
            agent_id = if ($input.agent_id) { $input.agent_id } else { "" }
        }
    }
    "PermissionDenied" {
        $devspriteEvent = "permission_denied"
        $data = @{}
    }
    "PermissionRequest" {
        $devspriteEvent = "permission_request"
        $isBlocking = $true
        $data = @{
            operation = if ($input.tool_name) { $input.tool_name } else { "" }
            target = if ($input.tool_input.file_path) { $input.tool_input.file_path } else { "" }
            reason = if ($input.tool_input.reason) { $input.tool_input.reason } else { "" }
        }
    }
    "PreCompact" {
        $devspriteEvent = "status_change"
        $data = @{
            status = "active"
            message = "正在压缩上下文..."
        }
    }
    default {
        $devspriteEvent = "status_change"
        $data = @{
            status = "active"
            message = "Event: $Event"
        }
    }
}

# Build the DevSprite event message
$message = @{
    event = $devspriteEvent
    timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    session_id = $sessionId
    data = $data
} | ConvertTo-Json -Depth 10

# Send to Named Pipe
$pipeName = "devsprite"

try {
    if ($isBlocking) {
        # === Bidirectional: PermissionRequest ===
        # Connect with InOut so we can read the response back from the server.
        $pipe = New-Object System.IO.Pipes.NamedPipeClientStream(
            ".",
            $pipeName,
            [System.IO.Pipes.PipeDirection]::InOut
        )
        $pipe.Connect(3000)
        # 30-second read timeout; if no response, fail-open.
        $pipe.ReadTimeout = 30000

        $writer = New-Object System.IO.StreamWriter($pipe)
        $writer.WriteLine($message)
        $writer.Flush()

        # Wait for the user to respond in the DevSprite UI.
        $reader = New-Object System.IO.StreamReader($pipe)
        $response = $null
        try {
            $response = $reader.ReadLine()
        } catch [System.IO.IOException] {
            # Read timeout — fail-open (default to approved).
            $response = '{"approved": true}'
        }

        $reader.Dispose()
        $writer.Dispose()
        $pipe.Dispose()

        # Output the response to stdout so Claude Code reads it.
        if ($response) {
            Write-Output $response
        } else {
            # Pipe closed without response — fail-open.
            Write-Output '{"approved": true}'
        }
    } else {
        # === Fire-and-forget: all other events ===
        $pipe = New-Object System.IO.Pipes.NamedPipeClientStream(
            ".",
            $pipeName,
            [System.IO.Pipes.PipeDirection]::Out
        )
        $pipe.Connect(3000)

        $writer = New-Object System.IO.StreamWriter($pipe)
        $writer.WriteLine($message)
        $writer.Flush()
        $writer.Dispose()
        $pipe.Dispose()
    }
} catch {
    # fail-open: if anything fails for a permission request, default to approved.
    if ($isBlocking) {
        Write-Output '{"approved": true}'
    }
}
