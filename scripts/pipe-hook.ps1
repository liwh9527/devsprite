# DevSprite Claude Code Hook - Reads stdin and sends to Named Pipe
# Called by Claude Code hooks (PreToolUse, PostToolUse, Notification, etc.)

param(
    [string]$Event = ""
)

# Read the full JSON payload from stdin
$stdin = [Console]::In.ReadToEnd()
$input = $stdin | ConvertFrom-Json

# Map Claude Code hook events to DevSprite events
$devspriteEvent = "status_change"
$sessionId = if ($input.session_id) { $input.session_id } else { [guid]::NewGuid().ToString() }
$data = @{}

switch ($Event) {
    "PreToolUse" {
        $devspriteEvent = "tool_call"
        $data = @{
            tool_name = if ($input.tool_name) { $input.tool_name } else { "" }
            file_path = if ($input.tool_input.file_path) { $input.tool_input.file_path } else { "" }
            status = "running"
        }
    }
    "PostToolUse" {
        $devspriteEvent = "tool_call"
        $data = @{
            tool_name = if ($input.tool_name) { $input.tool_name } else { "" }
            file_path = if ($input.tool_input.file_path) { $input.tool_input.file_path } else { "" }
            status = "completed"
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
catch {
    # Silently ignore - pipe might not be running
}
