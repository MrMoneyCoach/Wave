export type SlashCommand = {
  name: string;
  description: string;
  expand: (projectName: string) => string;
};

export const SLASH_COMMANDS: SlashCommand[] = [
  {
    name: "/status",
    description: "Summarize where this project stands",
    expand: (p) =>
      `Give me a concise status report for ${p}. Cover: current branch, uncommitted changes, recent commits, and anything that looks in-progress or broken. Keep it under 200 words.`,
  },
  {
    name: "/next",
    description: "Suggest what to work on next",
    expand: (p) =>
      `Based on the state of ${p} (TODOs, issues, recent commits, failing tests, unfinished code), suggest the top 3 things I should work on next. Rank by impact. One sentence each.`,
  },
  {
    name: "/plan",
    description: "Draft a plan for a task",
    expand: () =>
      `Draft a concrete step-by-step plan for the following task. List critical files to touch and call out tradeoffs. Do NOT start implementing yet — wait for my go-ahead.\n\nTask: `,
  },
  {
    name: "/review",
    description: "Review pending changes on this branch",
    expand: () =>
      `Review the uncommitted changes and recent commits on this branch. Flag bugs, regressions, unclear code, and anything risky. Rate the overall quality.`,
  },
  {
    name: "/commit",
    description: "Stage and commit pending changes",
    expand: () =>
      `Review my pending changes, write a good commit message (imperative mood, explains the why), stage the relevant files, and commit. Don't push yet.`,
  },
  {
    name: "/push",
    description: "Push the current branch",
    expand: () =>
      `Push the current branch to origin (set upstream if needed). If there's no PR yet, tell me — don't open one without asking.`,
  },
  {
    name: "/test",
    description: "Run the project's tests",
    expand: () =>
      `Run this project's test suite. If any fail, diagnose and propose a fix — don't apply it until I confirm.`,
  },
  {
    name: "/explain",
    description: "Explain a file or concept",
    expand: () =>
      `Explain the following in plain English — no code unless I ask. Assume I'm not a programmer.\n\n`,
  },
  {
    name: "/clear",
    description: "Start a fresh conversation for this project",
    expand: () => "",
  },
];

export function matchCommand(input: string): SlashCommand | null {
  if (!input.startsWith("/")) return null;
  const name = input.split(/\s/, 1)[0];
  return SLASH_COMMANDS.find((c) => c.name === name) ?? null;
}
