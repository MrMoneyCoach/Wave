# Alfred — No-Terminal Setup

This guide gets Alfred onto your Mac without using Terminal. Four steps, mostly clicking.

You'll need a few minutes and your Claude Max login.

---

## Step 1 — Install Node.js

Alfred runs on Node.js under the hood. Install it once:

1. Open **Chrome** and go to **https://nodejs.org**
2. Click the big green **LTS** download button.
3. Double-click the `.pkg` file in your Downloads folder.
4. Click **Continue → Continue → Install**, and enter your Mac password when asked.

Done. You won't need to touch Node.js again.

---

## Step 2 — Build Alfred on GitHub (no local build needed)

GitHub will build Alfred for you in the cloud:

1. Go to the repo's **Actions** tab:
   `https://github.com/MrMoneyCoach/Wave/actions/workflows/release.yml`
2. Click the grey **Run workflow** button on the right.
3. Make sure the branch is `claude/alfred-project-bot-zLj9R`, then click the green **Run workflow**.
4. Wait about 3–4 minutes for the build to finish (reload the page to see progress — the ● goes green when ready).
5. Click the finished run, scroll to the bottom, and click **Alfred-macOS** under **Artifacts**.
6. A zip file downloads. Double-click it to unzip. You'll see **two** DMGs:
   - **`Alfred-0.1.0-arm64.dmg`** — for Apple Silicon Macs (M1 / M2 / M3 / M4).
   - **`Alfred-0.1.0.dmg`** (or `-x64.dmg`) — for **Intel** Macs.

   Not sure which you have? Click the **Apple menu ( ) → About This Mac**. If it says "Chip: Apple M…", grab **arm64**. If it says "Processor: Intel…", grab the other one. Using the wrong one gives *"this application is not supported on this Mac"*.
7. Double-click the DMG that matches your Mac. Drag **Alfred** into the **Applications** folder that appears.
8. Open Launchpad and find Alfred. The first time you open it, macOS will say it can't verify the developer:
   - Close the warning.
   - Right-click Alfred in Applications → **Open** → **Open** again.
   - It'll remember this choice for the future.

Alfred is installed. But it won't work yet — it needs Claude Code to drive it.

---

## Step 3 — Install Claude Code (one click, no Terminal)

1. Open Alfred from Launchpad.
2. You'll see a banner at the top saying "Claude Code isn't installed yet". Click **Install for me**.
3. Alfred installs Claude Code in the background (~60 seconds). You'll see a log scroll past.
4. A browser tab opens for the Claude Max login. Sign in.
5. Come back to Alfred. The banner disappears. You're ready.

No Terminal window opens at any point.

---

## Step 4 — First launch

1. Open Alfred from Launchpad.
2. In the sidebar you'll see three placeholder projects — **Wave**, **Claude Code**, **Solomon**. For each:
   - Click it.
   - Click **Set folder** at the top of the chat.
   - Choose the folder on your disk. (Skip any you haven't downloaded yet.)
3. Add more projects any time with the **+** in the sidebar.
4. Click the **orb in the bottom-right** to turn voice on. Say *"Alfred, what's happening across all my projects?"* to test.
   - The first time you use voice, macOS will ask for microphone access. Click **OK**.
   - The first time you use Calendar / Reminders / Notes / Contacts / Messages / Outlook / Word / Excel, macOS will ask for automation access per app. Click **OK** each time — one-off.

You're set.

---

## If anything goes wrong

- **"This application is not supported on this Mac"** — you grabbed the wrong DMG for your chip. Go back to the Artifacts zip and use the other one (arm64 for Apple Silicon, x64 for Intel). See Step 2 for how to check which one you need.
- **"Alfred.app is damaged and can't be opened"** — macOS is being over-cautious. In **System Settings → Privacy & Security**, scroll to the bottom and click **Open Anyway** next to the Alfred warning.
- **The orb says "Voice off" and won't turn on** — check **System Settings → Privacy & Security → Microphone** and turn Alfred on.
- **Alfred says "Claude Code CLI not found"** — Step 3 didn't finish. Double-click `install-claude-code.command` again.
- **A voice command like *"check my calendar"* does nothing** — check **System Settings → Privacy & Security → Automation** and make sure Alfred is allowed to control that app.

If you're stuck, tell me which step and I'll help.
