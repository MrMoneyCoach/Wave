# Alfred

A personal Mac chat app to manage your Claude Code projects. No API costs — it drives the `claude` CLI under the hood and uses your Claude Max subscription.

## What it does

- One chat window per project (Wave, Claude Code, Solomon, anything you add)
- Remembers each conversation separately
- No terminal needed once installed

## First-time setup (for a non-programmer)

You only do this once. Copy and paste each command into the **Terminal** app (`Command + Space`, type "Terminal", hit Enter).

### 1. Install the tools you need

```bash
# Install Homebrew if you don't have it (it's the Mac package manager)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js (Alfred is built on it)
brew install node

# Install Claude Code (the engine Alfred drives)
npm install -g @anthropic-ai/claude-code

# Sign in with your Claude Max account (one-time)
claude login
```

### 2. Build Alfred

```bash
# Go to wherever you cloned this repo, then:
npm install
npm run package
```

When it finishes, open the new `release/` folder. Drag **Alfred.app** into your **Applications** folder. Done — double-click Alfred from Launchpad anytime.

### 3. Configure your projects

The first time you open Alfred, three placeholder projects are there: **Wave**, **Claude Code**, **Solomon**. For each one:

1. Click the project in the sidebar.
2. Click **Set folder** at the top.
3. Pick the folder on your disk.

You can add more projects with the **+** button.

## Daily use

Open Alfred. Click a project. Type. Alfred runs Claude Code in that folder and streams back the response. Click **New conversation** to start fresh.

## How it works (short version)

Alfred is an Electron app with a chat UI. Each project runs its own `claude` CLI session under the hood, with `--resume` so conversations persist. Zero API spend — everything goes through your Max subscription.

## Developer commands

```bash
npm run electron:dev   # live-reload dev mode
npm run package        # build a Mac .dmg in release/
```
