# DevSprite Bridge - Sends events to DevSocket via Named Pipe
# Usage: devsprite-bridge.ps1 <event_type> [--data <json>]

param(
    [Parameter(Position=0)]
    [string]$EventType,

    [Parameter()]
    [string]$Data
)

$pipeName = "devsprite"

function Send-Event {
    param(
        [string]$Event,
        [string]$JsonData
    )

    $timestamp = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    $sessionId = [guid]::NewGuid().ToString()

    $message = @{
        event = $Event
        timestamp = $timestamp
        session_id = $sessionId
        data = $JsonData | ConvertFrom-Json
    } | ConvertTo-Json -Depth 10

    try {
        $pipe = New-Object System.IO.Pipes.NamedPipeClientStream(
            ".",
            $pipeName,
            [System.IO.Pipes.PipeDirection]::Out
        )

        $pipe.Connect(5000)

        $writer = New-Object System.IO.StreamWriter($pipe)
        $writer.WriteLine($message)
        $writer.Flush()

        $pipe.Close()
        Write-Host "Event sent: $Event"
    }
    catch {
        Write-Warning "Failed to send event: $_"
    }
}

switch ($EventType) {
    "tool_call" {
        $data = if ($Data) { $Data } else { '{"tool_name":"unknown","file_path":"","status":"pending"}' }
        Send-Event -Event "tool_call" -JsonData $data
    }
    "permission_request" {
        $data = if ($Data) { $Data } else { '{"operation":"unknown","target":"","reason":""}' }
        Send-Event -Event "permission_request" -JsonData $data
    }
    "notification" {
        $data = if ($Data) { $Data } else { '{"message":""}' }
        Send-Event -Event "status_change" -JsonData $data
    }
    default {
        Write-Host "Usage: devsprite-bridge.ps1 <event_type> [--data <json>]"
        Write-Host "Event types: tool_call, permission_request, notification"
    }
}
