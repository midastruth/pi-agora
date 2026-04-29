import type { ExecResult, ExtensionAPI } from "@mariozechner/pi-coding-agent";

const DEFAULT_BASE = "main";
const TIMEOUT_MS = 10_000;

function block(label: string, value: string): string {
	return [`${label}:`, "```", value.trimEnd(), "```"].join("\n");
}

function shellQuote(value: string): string {
	return "'" + value.replace(/'/g, "'\\''") + "'";
}

function commandFailureMessage(command: string, result: ExecResult): string {
	return [
		"Please help with the PR workflow, but a deterministic preflight command failed. Diagnose the problem and tell the user what to do next.",
		"",
		`Command: \`${command}\``,
		`Exit code: ${result.code}${result.killed ? " (killed)" : ""}`,
		"",
		block("stdout", result.stdout || "<empty>"),
		"",
		block("stderr", result.stderr || "<empty>"),
	].join("\n");
}

async function run(pi: ExtensionAPI, cwd: string, command: string): Promise<ExecResult> {
	return pi.exec("bash", ["-lc", command], { cwd, timeout: TIMEOUT_MS });
}

function prPrompt(base: string, branch: string, status: string, log: string, stat: string): string {
	return [
		`Please review branch \`${branch}\` against \`${base}\` and handle the PR-style merge workflow.`,
		"",
		"Required behavior:",
		"- Fetch/sync the base branch first if needed.",
		"- Inspect the diff and run any lightweight checks that are relevant.",
		"- Assess whether merging this branch into the base branch is safe.",
		"- If there is meaningful risk, do not merge; explain the risk and recommended fix.",
		"- If it is low risk, merge the branch into the base branch locally.",
		"- Do not push the merge unless the user explicitly asks to push.",
		"- If a git command fails, diagnose it and tell the user what to do next.",
		"",
		block("git status --short --branch", status || "<empty>"),
		"",
		block(`git log --oneline ${base}..${branch}`, log || "<empty>"),
		"",
		block(`git diff --stat ${base}...${branch}`, stat || "<empty>"),
	].join("\n");
}

export default function prExtension(pi: ExtensionAPI) {
	pi.registerCommand("pr", {
		description: "Ask the LLM to review the current branch and merge into a base branch if safe",
		handler: async (args, ctx) => {
			await ctx.waitForIdle();
			ctx.ui.setStatus("pr", "preparing review");

			try {
				const base = args.trim() || DEFAULT_BASE;
				const branch = await run(pi, ctx.cwd, "git branch --show-current");
				if (branch.code !== 0) {
					pi.sendUserMessage(commandFailureMessage("git branch --show-current", branch));
					return;
				}

				const branchName = branch.stdout.trim();
				if (!branchName) {
					pi.sendUserMessage("Please review and merge this work, but Git is in detached HEAD state. Explain the situation and suggest switching to a branch first.");
					return;
				}

				const status = await run(pi, ctx.cwd, "git status --short --branch");
				if (status.code !== 0) {
					pi.sendUserMessage(commandFailureMessage("git status --short --branch", status));
					return;
				}

				const dirty = status.stdout
					.split("\n")
					.map((line) => line.trimEnd())
					.some((line) => line && !line.startsWith("##"));
				if (dirty) {
					pi.sendUserMessage(
						[
							`Please prepare a PR-style review for branch \`${branchName}\`, but do not merge yet because the worktree has uncommitted changes.`,
							"",
							"Explain that the user should commit, stash, or discard the changes before merge review.",
							"",
							block("git status --short --branch", status.stdout),
						].join("\n"),
					);
					return;
				}

				const log = await run(pi, ctx.cwd, `git log --oneline ${shellQuote(base)}..${shellQuote(branchName)}`);
				const stat = await run(pi, ctx.cwd, `git diff --stat ${shellQuote(base)}...${shellQuote(branchName)}`);
				pi.sendUserMessage(prPrompt(base, branchName, status.stdout, log.stdout || log.stderr, stat.stdout || stat.stderr));
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				pi.sendUserMessage(
					[
						"Please help with the PR workflow, but the PR extension failed before it could prepare the request.",
						"",
						block("error", message),
					].join("\n"),
				);
			} finally {
				ctx.ui.setStatus("pr", undefined);
			}
		},
	});
}
