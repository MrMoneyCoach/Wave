export function ClaudeBanner() {
  return (
    <div className="banner">
      <strong>Claude Code CLI not found.</strong>
      <span>
        Alfred drives the <code>claude</code> command under the hood. Install it with{" "}
        <code>npm install -g @anthropic-ai/claude-code</code>, then run <code>claude login</code>{" "}
        once to authenticate with your Max plan.
      </span>
    </div>
  );
}
