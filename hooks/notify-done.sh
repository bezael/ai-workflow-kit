#!/bin/bash
# Hook: notify-done
# Runs when Claude Code finishes responding (Stop event).
# Sends a desktop notification so you know when a long task is done.
#
# Useful when you send Claude to do something and go do something else.

INPUT=$(cat)
# The agent that finished: Claude Code unless the caller says otherwise
# (the Pi extension sets AK_AGENT_NAME=Pi).
AGENT="${AK_AGENT_NAME:-Claude Code}"
MESSAGE=$(echo "$INPUT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
# The stop message may include Claude's last text
stop_reason = d.get('stop_reason', 'done')
print(f'{sys.argv[1]} finished ({stop_reason})')
" "$AGENT" 2>/dev/null || echo "$AGENT finished")

# ─── MACOS ───────────────────────────────────────────────────────────────────
if [[ "$OSTYPE" == "darwin"* ]]; then
  osascript -e "display notification \"$MESSAGE\" with title \"$AGENT\" sound name \"Glass\"" 2>/dev/null
  exit 0
fi

# ─── LINUX (notify-send) ─────────────────────────────────────────────────────
if command -v notify-send &>/dev/null; then
  notify-send "$AGENT" "$MESSAGE" --icon=terminal 2>/dev/null
  exit 0
fi

# ─── WINDOWS (PowerShell) ────────────────────────────────────────────────────
if command -v powershell.exe &>/dev/null; then
  powershell.exe -Command "
    Add-Type -AssemblyName System.Windows.Forms
    \$notify = New-Object System.Windows.Forms.NotifyIcon
    \$notify.Icon = [System.Drawing.SystemIcons]::Information
    \$notify.BalloonTipIcon = 'Info'
    \$notify.BalloonTipTitle = '$AGENT'
    \$notify.BalloonTipText = '$MESSAGE'
    \$notify.Visible = \$true
    \$notify.ShowBalloonTip(5000)
    Start-Sleep -Seconds 1
  " 2>/dev/null
  exit 0
fi

# Fallback: log to terminal
echo "✅ $MESSAGE"
exit 0
