export function ClaudeBanner() {
  return (
    <div className="banner">
      <strong>Claude Code CLI not found.</strong>
      <span>
        Alfred can't find the <code>claude</code> command on your Mac. If you haven't installed it
        yet, double-click <code>scripts/mac/install-claude-code.command</code> from the repo — it
        installs Claude Code and signs you in with your Max plan, no Terminal typing needed. If you
        <em> have</em> installed it (you ran <code>claude login</code> successfully), quit Alfred
        fully with <kbd>⌘Q</kbd> and reopen it so it picks up your shell's PATH.
      </span>
    </div>
  );
}
