import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CATEGORY_DIRS = [
	"Command",
	"Tool",
	"Event-Hook",
	"UI-Notification",
	"Workflow-Automation",
	"Integration",
	"Template-Example",
	"Utility-Developer-Experience",
] as const;

type CatalogItem = {
	name: string;
	repoDir: string;
	path: string;
	github?: string;
	category: string;
	tags: string[];
	summary: string;
	features: string;
	scenarios: string;
	installHint: string;
	installSource?: string;
	requiresConfig?: boolean;
	thirdPartyApi?: boolean;
};

type AssistantConfig = {
	onboarded?: boolean;
};

function packageRoot(): string {
	const here = path.dirname(fileURLToPath(import.meta.url));
	return path.resolve(here, "../..");
}

function stripMarkdown(input: string): string {
	return input
		.replace(/`([^`]+)`/g, "$1")
		.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
		.replace(/[*_#>-]/g, "")
		.replace(/\s+/g, " ")
		.trim();
}

function parseField(markdown: string, field: string): string {
	const escaped = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const match = markdown.match(new RegExp(`^- \\*\\*${escaped}\\*\\*:\\s*(.+)$`, "m"));
	return match ? stripMarkdown(match[1]) : "";
}

function parseGithub(markdown: string): string | undefined {
	const fieldLine = markdown.match(/^- \*\*GitHub\*\*:\s*(.+)$/m)?.[1] ?? "";
	const link = fieldLine.match(/\((https?:\/\/github\.com\/[^)]+)\)/)?.[1];
	const plain = fieldLine.match(/https?:\/\/github\.com\/[^\s)]+/)?.[0];
	return (link ?? plain)?.replace(/\/$/, "");
}

function parseTags(value: string): string[] {
	return value
		.split(/[,，]/)
		.map((tag) => tag.replace(/`/g, "").trim())
		.filter(Boolean);
}

function parseSection(markdown: string, heading: string): string {
	const headingPattern = new RegExp(`^## ${heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "m");
	const startMatch = headingPattern.exec(markdown);
	if (!startMatch) return "";

	const sectionStart = startMatch.index + startMatch[0].length;
	const rest = markdown.slice(sectionStart).replace(/^\n/, "");
	const nextHeading = rest.search(/^##\s+/m);
	const section = nextHeading >= 0 ? rest.slice(0, nextHeading) : rest;
	return stripMarkdown(section);
}

function parseInstallSource(markdown: string, github?: string): string | undefined {
	const commandMatch = markdown.match(/pi\s+install\s+(?:-l\s+)?(`?)([^`\s]+)\1/);
	if (commandMatch?.[2]) return commandMatch[2].trim();
	return github;
}

function loadCatalog(root = packageRoot()): CatalogItem[] {
	const items: CatalogItem[] = [];

	for (const category of CATEGORY_DIRS) {
		const categoryPath = path.join(root, category);
		if (!existsSync(categoryPath)) continue;

		for (const entry of readdirSync(categoryPath, { withFileTypes: true })) {
			if (!entry.isDirectory()) continue;

			const readmePath = path.join(categoryPath, entry.name, "README.md");
			if (!existsSync(readmePath)) continue;

			const markdown = readFileSync(readmePath, "utf8");
			const name = markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() || entry.name;
			const github = parseGithub(markdown);
			const tags = parseTags(parseField(markdown, "标签"));
			const installHint = parseField(markdown, "安装方式") || parseSection(markdown, "安装与使用");

			items.push({
				name,
				repoDir: entry.name,
				path: path.relative(root, readmePath),
				github,
				category: parseField(markdown, "主分类") || category,
				tags,
				summary: parseField(markdown, "一句话总结"),
				features: parseSection(markdown, "功能说明"),
				scenarios: parseSection(markdown, "适用场景"),
				installHint,
				installSource: parseInstallSource(markdown, github),
				requiresConfig: /requires-config|配置要求|API|token|key/i.test(markdown),
				thirdPartyApi: /third-party-api|第三方服务|API|GitHub|Telegram|Google|Gemini|Slack/i.test(markdown),
			});
		}
	}

	return items.sort((a, b) => a.name.localeCompare(b.name));
}

function normalize(input: string): string {
	return input.toLowerCase().replace(/\s+/g, " ").trim();
}

function scoreItem(item: CatalogItem, query: string): number {
	const q = normalize(query);
	if (!q) return 1;

	const haystack = normalize(
		[
			item.name,
			item.repoDir,
			item.category,
			item.tags.join(" "),
			item.summary,
			item.features,
			item.scenarios,
		].join("\n"),
	);

	let score = 0;
	if (haystack.includes(q)) score += 10;
	for (const token of q.split(/[\s,，;；]+/).filter(Boolean)) {
		if (haystack.includes(token)) score += Math.max(1, Math.min(5, token.length));
	}
	return score;
}

function searchCatalog(items: CatalogItem[], query = "", category = "", limit = 8, includeNonExtension = true): CatalogItem[] {
	const normalizedCategory = normalize(category);
	return items
		.filter((item) => includeNonExtension || !item.tags.includes("non-extension"))
		.filter((item) => !normalizedCategory || normalize(item.category).includes(normalizedCategory) || normalize(item.path).includes(normalizedCategory))
		.map((item) => ({ item, score: scoreItem(item, query) }))
		.filter(({ score }) => score > 0)
		.sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
		.slice(0, Math.max(1, Math.min(limit, 20)))
		.map(({ item }) => item);
}

function formatItem(item: CatalogItem): string {
	const flags = [
		item.requiresConfig ? "需要配置" : "通常无需额外配置或未明确",
		item.thirdPartyApi ? "涉及第三方服务" : "未明显依赖第三方服务",
	].join("；");

	return [
		`## ${item.name}`,
		`- 分类：${item.category}`,
		`- 标签：${item.tags.length ? item.tags.join(", ") : "无"}`,
		`- 摘要：${item.summary || "未明确说明"}`,
		`- 适合：${item.scenarios || "未明确说明"}`,
		`- 安装：${item.installHint || item.installSource || "未明确说明"}`,
		`- 来源：${item.github || "未明确说明"}`,
		`- 注意：${flags}`,
		`- 本地记录：${item.path}`,
	].join("\n");
}

function configPath(): string {
	return path.join(homedir(), ".pi", "agent", "pi-agora.json");
}

function readConfig(): AssistantConfig {
	try {
		const file = configPath();
		if (!existsSync(file)) return {};
		return JSON.parse(readFileSync(file, "utf8"));
	} catch {
		return {};
	}
}

function writeConfig(config: AssistantConfig) {
	const file = configPath();
	mkdirSync(path.dirname(file), { recursive: true });
	writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`);
}

function advisorPrompt(userNeed: string): string {
	return [
		"我刚安装了 pi-agora。",
		`我的需求是：${userNeed}`,
		"请先调用 pi_agora_search 在本地收藏库中检索候选项目，然后用中文给出 3 个以内推荐。",
		"每个推荐请说明：能解决什么问题、是否需要配置、安装命令或安装来源、风险/限制。",
		"如果我明确选择其中一个项目并要求安装，请调用 pi_agora_install；安装前需要让我确认。",
	].join("\n");
}

export default function piAgora(pi: ExtensionAPI) {
	pi.registerTool({
		name: "pi_agora_search",
		label: "pi-agora Search",
		description: "Search the local Pi Extensions Collection for extensions, skills, integrations, and workflow tools that match a user's desired capability.",
		promptSnippet: "Search curated Pi extension/skill records by user need, category, tag, or repository name.",
		promptGuidelines: [
			"Use pi_agora_search when the user asks what Pi extension, skill, integration, tool, workflow, notification, or automation capability they should install.",
			"After pi_agora_search returns candidates, compare configuration requirements and risks instead of only listing names.",
		],
		parameters: Type.Object({
			query: Type.Optional(Type.String({ description: "User need or keywords, e.g. web search, Telegram, code review, subagents, rollback." })),
			category: Type.Optional(Type.String({ description: "Optional category filter, e.g. Tool, Integration, Workflow, Command." })),
			limit: Type.Optional(Type.Number({ description: "Maximum number of results, default 8, max 20." })),
			includeNonExtension: Type.Optional(Type.Boolean({ description: "Whether to include non-extension skill collections. Default true." })),
		}),
		async execute(_toolCallId, params) {
			const catalog = loadCatalog();
			const results = searchCatalog(
				catalog,
				params.query ?? "",
				params.category ?? "",
				params.limit ?? 8,
				params.includeNonExtension ?? true,
			);

			if (results.length === 0) {
				return {
					content: [{ type: "text", text: "没有在 Pi Extensions Collection 中找到匹配项目。可以换更宽泛的关键词再试。" }],
					details: { count: 0, query: params.query ?? "" },
				};
			}

			return {
				content: [{ type: "text", text: results.map(formatItem).join("\n\n") }],
				details: { count: results.length, results },
			};
		},
	});

	pi.registerTool({
		name: "pi_agora_install",
		label: "pi-agora Install",
		description: "Install a selected Pi extension/package from the local Pi Extensions Collection by repository name. Always asks for user confirmation before running pi install.",
		promptSnippet: "Install a selected package from pi-agora after the user clearly chooses it.",
		promptGuidelines: [
			"Use pi_agora_install only after the user clearly states which pi-agora project they want to install.",
			"Before installing with pi_agora_install, tell the user that Pi packages run with full system permissions and may require third-party API configuration.",
		],
		parameters: Type.Object({
			repo: Type.String({ description: "Repository or package name from search results, e.g. pi-web-search." }),
			scope: Type.Optional(Type.Union([Type.Literal("global"), Type.Literal("project")], { description: "Install globally or into the current project settings. Default global." })),
			ref: Type.Optional(Type.String({ description: "Optional git ref/version to append with @ref when installing from GitHub." })),
		}),
		async execute(_toolCallId, params, signal, _onUpdate, ctx) {
			const catalog = loadCatalog();
			const wanted = normalize(params.repo);
			const item = catalog.find((candidate) => [candidate.name, candidate.repoDir].some((value) => normalize(value) === wanted))
				?? searchCatalog(catalog, params.repo, "", 1)[0];

			if (!item) {
				return {
					isError: true,
					content: [{ type: "text", text: `未找到项目：${params.repo}` }],
				};
			}

			let source = item.installSource;
			if (!source) {
				return {
					isError: true,
					content: [{ type: "text", text: `${item.name} 的安装来源未明确记录，不能自动安装。请先查看 ${item.path}。` }],
					details: { item },
				};
			}

			if (params.ref && source.startsWith("https://github.com/") && !source.includes("@")) {
				source = `${source}@${params.ref}`;
			}

			const scope = params.scope ?? "global";
			const args = ["install", ...(scope === "project" ? ["-l"] : []), source];
			const commandText = `pi ${args.join(" ")}`;
			const warning = [
				`将安装：${item.name}`,
				`来源：${source}`,
				`范围：${scope === "project" ? "当前项目 .pi/settings.json" : "全局 ~/.pi/agent/settings.json"}`,
				"注意：Pi 扩展会以你的本机权限运行。请只安装可信来源。",
				item.requiresConfig ? "该项目可能还需要额外配置 API key / token / provider。" : "",
				`将执行：${commandText}`,
			].filter(Boolean).join("\n");

			if (!ctx.hasUI) {
				return {
					isError: true,
					content: [{ type: "text", text: `当前环境没有交互式 UI，未执行安装。请手动确认后运行：${commandText}` }],
					details: { item, command: commandText },
				};
			}

			const ok = await ctx.ui.confirm("确认安装 Pi 扩展？", warning);
			if (!ok) {
				return {
					content: [{ type: "text", text: `已取消安装。可手动执行：${commandText}` }],
					details: { item, command: commandText, cancelled: true },
				};
			}

			const result = await pi.exec("pi", args, { signal, timeout: 120_000 });
			const output = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
			const success = result.code === 0;

			return {
				isError: !success,
				content: [{
					type: "text",
					text: success
						? `安装完成：${item.name}\n\n${output || "pi install 执行成功。"}\n\n如扩展未立即生效，请运行 /reload 或重启 pi。`
						: `安装失败：${item.name}\n命令：${commandText}\n\n${output || `退出码：${result.code}`}`,
				}],
				details: { item, command: commandText, result },
			};
		},
	});

	pi.registerCommand("pi-agora", {
		description: "启动 pi-agora 扩展/Skill 推荐与安装向导",
		handler: async (args, ctx) => {
			let need = args.trim();
			if (!need && ctx.hasUI) {
				need = (await ctx.ui.input("pi-agora", "你想给 pi 增加什么功能？例如：联网搜索、Telegram、代码审查、多代理、回滚。"))?.trim() ?? "";
			}

			if (!need) {
				ctx.ui.notify("用法：/pi-agora <你需要的功能>", "info");
				return;
			}

			const prompt = advisorPrompt(need);
			if (ctx.isIdle()) {
				pi.sendUserMessage(prompt);
			} else {
				pi.sendUserMessage(prompt, { deliverAs: "followUp" });
				ctx.ui.notify("已排队 pi-agora 推荐请求。", "info");
			}
		},
	});

	pi.on("session_start", async (event, ctx) => {
		if (event.reason !== "startup") return;
		if (process.env.PI_AGORA_AUTO_ONBOARD === "0") return;
		if (!ctx.hasUI) return;

		const config = readConfig();
		if (config.onboarded) {
			ctx.ui.notify("pi-agora 已启用。输入 /pi-agora 可按需求查找和安装扩展。", "info");
			return;
		}

		writeConfig({ ...config, onboarded: true });
		pi.sendUserMessage([
			{
				type: "text",
				text: [
					"pi-agora 已安装。请作为 Pi 扩展安装向导，用中文简短询问我想给 pi 增加什么功能。",
					"现在只提出问题，不要调用工具、不要直接推荐项目。",
					"等我回答需求后，再调用 pi_agora_search 检索本仓库记录并给出建议；等我明确选择要安装的项目后，再调用 pi_agora_install。",
					"同时告诉我也可以输入 /pi-agora <功能需求> 直接启动推荐。",
				].join("\n"),
			},
		]);
	});
}
