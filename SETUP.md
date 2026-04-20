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
6. A zip file downloads. Double-click it to unzip. You'll get a file like **Alfred-0.1.0-arm64.dmg**.
7. Double-click the DMG. Drag **Alfred** into the **Applications** folder that appears.
8. Open Launchpad and find Alfred. The first time you open it, macOS will say it can't verify the developer:
   - Close the warning.
   - Right-click Alfred in Applications → **Open** → **Open** again.
   - It'll remember this choice for the future.

Alfred is installed. But it won't work yet — it needs Claude Code to drive it.

---

## Step 3 — Install Claude Code (double-click, no typing)

1. In the repo, open the file **`scripts/mac/install-claude-code.command`**:
   `https://github.com/MrMoneyCoach/Wave/blob/claude/alfred-project-bot-zLj9R/scripts/mac/install-claude-code.command`
2. Click the **Raw** button (top right of the file viewer), then **right-click the page → Save As…** and save `install-claude-code.command` to your **Downloads** folder. Make sure the name ends in `.command` (not `.txt`).
3. In Finder, double-click the file. Terminal will open automatically and run the install.
   - If macOS blocks it, right-click the file → **Open** → **Open** once.
4. It'll ask to open **nodejs.org** if Node isn't installed yet — you did that in Step 1, so it should skip straight past that and start installing Claude Code.
5. When it says *"a browser will open"*, it'll open Chrome with a Claude login page. Log in with your **Claude Max** account. When Claude says *"logged in successfully"*, come back to the Terminal window — it'll say **Done!**
6. Press **Enter** to close the Terminal window.

**You won't need to touch Terminal again.**

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

- **"Alfred.app is damaged and can't be opened"** — macOS is being over-cautious. In **System Settings → Privacy & Security**, scroll to the bottom and click **Open Anyway** next to the Alfred warning.
- **The orb says "Voice off" and won't turn on** — check **System Settings → Privacy & Security → Microphone** and turn Alfred on.
- **Alfred says "Claude Code CLI not found"** — Step 3 didn't finish. Double-click `install-claude-code.command` again.
- **A voice command like *"check my calendar"* does nothing** — check **System Settings → Privacy & Security → Automation** and make sure Alfred is allowed to control that app.

If you're stuck, tell me which step and I'll help.
