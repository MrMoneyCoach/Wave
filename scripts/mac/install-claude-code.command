#!/bin/bash
# Double-click this file on your Mac to install Claude Code (the engine
# Alfred uses) and sign in with your Claude Max subscription. No typing
# required.
#
# If macOS blocks this with a "can't be opened" warning, right-click the
# file and choose "Open" once.

set -e

echo ""
echo "==============================================="
echo "  Alfred — installing Claude Code"
echo "==============================================="
echo ""

# 1. Make sure Node.js is on PATH. If not, send the user to the official
#    installer and stop — they can come back here once it's installed.
if ! command -v node >/dev/null 2>&1; then
  cat <<'EONODE'
Node.js isn't installed yet. Alfred needs it to run Claude Code.

I'll open https://nodejs.org in your browser. Please:
  1. Click the big green "LTS" download button.
  2. Run the .pkg installer you downloaded (double-click, follow prompts).
  3. Come back and double-click this file again.

EONODE
  open "https://nodejs.org/" 2>/dev/null || true
  echo "Press Enter to close this window..."
  read _
  exit 0
fi

echo "Node.js found: $(node --version)"
echo ""

# 2. Install or upgrade Claude Code. -g makes it globally available.
echo "Installing Claude Code (this takes a minute)..."
echo ""
if npm install -g @anthropic-ai/claude-code; then
  echo ""
  echo "Claude Code installed: $(claude --version 2>/dev/null || echo 'ready')"
else
  cat <<'EOFAIL'

The npm install failed. Most common fix: you may need to give npm
permission to write to its global folder. Copy this URL into your
browser for the official fix:

  https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally

Then double-click this file again.

EOFAIL
  echo "Press Enter to close this window..."
  read _
  exit 1
fi

echo ""
echo "==============================================="
echo "  Signing you in — a browser will open"
echo "==============================================="
echo ""
echo "Follow the instructions in the browser to sign in with your"
echo "Claude Max account. When it says 'logged in successfully', come"
echo "back here."
echo ""

# 3. Trigger the OAuth login flow. This opens a browser automatically.
claude login || true

echo ""
echo "==============================================="
echo "  Done! You can now open Alfred."
echo "==============================================="
echo ""
echo "Press Enter to close this window..."
read _
