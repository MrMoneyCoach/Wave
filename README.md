# Alfred

A personal Mac chat app for managing your Claude Code projects. Markdown output, real-time tool visibility, per-project memory, slash commands — all running on your **Claude Max subscription** (no API fees).

![Alfred](https://img.shields.io/badge/platform-macOS-black) ![Powered by](https://img.shields.io/badge/powered%20by-Claude%20Code-d4a657)

## What it does

- **Alfred, a talking orb in the corner** — an animated avatar that listens, thinks, and speaks back
- **Wake word: "Alfred"** — any sentence starting with "Alfred, …" becomes a command
- **Mac-native superpowers** — open URLs, search LinkedIn/Google/GitHub in your *logged-in* browser, find files with Spotlight, launch apps
- **Cross-project Commander** — the Alfred pinned at the top of the sidebar can work across every project ("what's happening across everything?")
- **One chat per project** — Wave, Claude Code, Solomon, or anything you add
- **Watches Claude work** — see files being read, edits being made, commands running, in real time
- **Remembers** — each project keeps its own conversation history across restarts
- **Slash commands** — `/status`, `/next`, `/plan`, `/review`, `/commit`, `/push`, `/test`, `/explain`, `/clear`
- **Safe by default, autonomous when you want it** — toggle per project
- **Auto-updates** — new versions install themselves in the background
- **Keyboard-first** — `⌘0` Commander, `⌘1`..`⌘9` projects, `⌘N` new, `⌘.` stop, `⌘⇧V` toggle voice
- **Zero API spend** — drives the `claude` CLI, authed with your Max plan

## Install (non-programmer version)

### Option A: Download the prebuilt app (easiest)

1. Push a tag like `v0.1.0` to this repo. GitHub Actions builds `Alfred.dmg` for you.
2. Grab it from the repo's **Releases** page.
3. Open the DMG, drag **Alfred** to Applications.
4. First launch: right-click → **Open** (the app isn't Apple-signed; this only happens once).

Before launching, install Claude Code once from Terminal (Cmd+Space → "Terminal"):

```bash
# Homebrew (if you don't have it)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Node.js + Claude Code
brew install node
npm install -g @anthropic-ai/claude-code

# Sign in with your Claude Max subscription
claude login
```

### Option B: Build locally

```bash
git clone <this repo>
cd Wave
npm install
npm run package
open release/   # drag Alfred.app to Applications
```

## First time opening Alfred

Three projects are pre-seeded: **Wave**, **Claude Code**, **Solomon**. For each:

1. Click the project in the sidebar.
2. Click **Set folder** and pick the folder on your disk.
3. Start chatting.

Add more projects any time with the **+** button.

## Talking to Alfred

Click the orb in the bottom-right to turn voice on. Then just start a sentence with "Alfred":

> "Alfred, what's happening across all my projects?"
> "Alfred, search the web for frontend job postings"
> "Alfred, commit the pending changes on Wave"

Alfred listens continuously while the orb is on. It pauses its mic while speaking so it doesn't hear itself. Turn voice off any time with `⌘⇧V` or by clicking the orb.

### What Alfred can do out loud

**Web & apps**
- **"Alfred, search LinkedIn for Swift Engineer roles in London"** — opens LinkedIn jobs in your default browser with your existing login
- **"Alfred, open the GitHub notifications page"** — any URL or site
- **"Alfred, open Messages"** — launches any Mac app

**Files**
- **"Alfred, find the file called budget 2024"** — Spotlight search, then offers to open or reveal it
- **"Alfred, reveal Wave in Finder"**

**Calendar & Reminders**
- **"Alfred, put lunch with Sam in my calendar for Friday 1pm"**
- **"Alfred, what's on my calendar today?"**
- **"Alfred, remind me to call mum tomorrow at 6pm"**
- **"Alfred, what's on my reminders?"**

**Notes & dictation**
- **"Alfred, make a note of today's standup: …"**
- **"Alfred, type this into the email I'm writing: …"** — switches back to your email app and pastes

**Cross-project**
- **"Alfred, what's happening across all my projects?"** — iterates every project folder and summarises

Because site searches open in *your* browser, every login you already have — LinkedIn, Gmail, Twitter, GitHub, Amazon — just works. No cookie handling required.

### First-time permissions

The first time Alfred touches Calendar, Reminders, Notes, or the paste-text tool, macOS will show a one-time permission prompt. Click **OK**. If you miss it, go to **System Settings → Privacy & Security → Automation** (or **Accessibility** for paste-text) and tick Alfred.

## Daily use

Type naturally, or hit `/` for slash commands:

- `/status` — where does this project stand?
- `/next` — what should I work on?
- `/plan build a login page` — get a plan before code changes
- `/commit` — stage + commit pending changes with a good message
- `/review` — second opinion on your uncommitted changes

Press `Enter` to send, `Shift+Enter` for a new line. Press **Stop** (or `⌘.`) to interrupt Alfred mid-response.

## Safe mode vs Autonomous

Every project has a toggle in the top-right:

- **Safe mode** (green) — Claude asks before risky actions (editing files, running commands). Best for important projects.
- **Autonomous** (gold) — Claude runs without asking. Faster, but grants full shell access in that folder. Use for side projects or when you're watching closely.

## How it works

Alfred is an Electron app. Each project spawns its own `claude` CLI subprocess that stays resumable across turns. Output is parsed from Claude Code's `stream-json` format into a live block-based view — text, tool calls, and tool results all stream in as they happen. Conversations persist in `~/Library/Application Support/Alfred/`.

## Developer commands

```bash
npm run electron:dev   # hot-reload dev mode
npm run package        # build .dmg in release/
npm run package:dir    # faster: .app bundle without DMG
```

## Keyboard shortcuts

| Shortcut | Action |
| --- | --- |
| `⌘0` | Jump to Alfred (Commander) |
| `⌘1` – `⌘9` | Jump to project 1–9 |
| `⌘]` / `⌘[` | Next / previous project |
| `⌘N` | New conversation |
| `⌘.` | Stop Alfred |
| `⌘⇧V` | Toggle voice |
| `/` | Open slash-command palette |
| `Enter` / `Shift+Enter` | Send / new line |
