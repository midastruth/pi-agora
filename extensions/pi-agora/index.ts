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
		"请使用用户当前使用的语言交流；如果用户切换语言，也跟随切换。",
		`我的需求是：${userNeed}`,
		"请结合当前项目上下文理解这个需求；如上下文不足，可以先简短询问补充信息。",
		"请调用 pi_agora_search 在本地收藏库中检索候选项目，然后给出 3 个以内推荐。",
		"每个推荐请说明：为什么适合当前项目、能解决什么问题、是否需要配置、安装命令或安装来源、风险/限制。",
		"如果我明确选择其中一个项目并要求安装，请调用 pi_agora_install；安装前需要让我确认。",
	].join("\n");
}

function isPublishIntent(input: string): boolean {
	return /发布|提交|收录|投稿|上架|登记|贡献|contribut|submit|publish|add\s+(?:my\s+)?(?:extension|plugin|skill)/i.test(input);
}

function publisherPrompt(userInput: string): string {
	return [
		"我想把自己的 Pi 插件、扩展、Skill 或增强 Pi 能力的项目发布/收录到 pi-agora。",
		userInput ? `我的补充信息是：${userInput}` : "我还没有提供完整项目信息。",
		"请作为 pi-agora 收录助手，使用用户当前使用的语言帮助我完成发布流程；如果用户切换语言，也跟随切换。",
		"如果用户有 GitHub 仓库链接，请阅读 README、package.json、src/、扩展入口、命令/tool/event/UI 相关代码与安装说明。",
		"如果用户没有 GitHub，但当前项目里有 Pi extension / Skill，请先做只读本地检查：package.json 的 pi.extensions、extensions/、skills/、SKILL.md、src/、README、安装脚本与配置示例。",
		"没有 GitHub 时，不要声称已经公开发布；请帮助用户把本地项目整理成可发布包：补齐 README、license、package.json metadata、安装说明、配置说明、截图/示例，并生成可复制的 pi-agora 收录记录草稿。",
		"同时说明 pi-agora 的公共收录通常需要一个可访问来源；推荐创建 GitHub 仓库，也可让维护者代提交或先保留本地 submission draft。",
		"判断它是否与 Pi 扩展 / Skills / agent 能力扩展相关，并按功能选择主分类：Command、Tool、Event-Hook、UI-Notification、Workflow-Automation、Integration、Template-Example、Utility-Developer-Experience。",
		"如果当前工作区就是 pi-agora 仓库，并且我确认要收录，请创建/更新对应分类下的仓库 README，更新根 README 与分类 README，运行 python3 scripts/validate_collection.py；提交或推送前需要我明确要求。",
		"如果当前工作区不是 pi-agora 仓库，请不要修改当前项目，除非用户明确要求整理发布材料；请指导我 fork/clone https://github.com/midastruth/pi-agora，或准备可复制的收录记录/PR 步骤。",
		"记录内容要提炼实际价值，不要照抄 README；信息不足时明确写未明确说明或需要进一步确认。",
	].join("\n");
}

function publishGuide(repositoryUrl = "", projectName = "", capability = "", localProject = false): string {
	return [
		"# pi-agora 发布 / 收录流程",
		projectName ? `- 项目名称：${projectName}` : "- 项目名称：未提供",
		repositoryUrl ? `- GitHub：${repositoryUrl}` : "- GitHub：未提供；如果当前项目是本地 Pi 扩展 / Skill，请先按本地项目流程整理发布材料。",
		capability ? `- 能力描述：${capability}` : "- 能力描述：未提供，可询问它给 Pi 增加了什么能力。",
		localProject ? "- 当前模式：本地项目，无公开 GitHub 来源" : "- 当前模式：公开仓库或待确认",
		"",
		"## 助手应执行的步骤",
		"1. 先确认用户是想把自己的 Pi extension / Skill / agent 能力增强项目收录进 pi-agora，而不是安装已有项目。",
		"2. 如果有 GitHub 仓库链接，读取 README、package.json、src/、扩展入口和配置说明。",
		"3. 如果没有 GitHub，但当前工作区就是要发布的项目，只做只读检查：package.json 的 pi.extensions、extensions/、skills/、SKILL.md、src/、README、安装脚本与配置示例。",
		"4. 帮用户整理发布前清单：README、license、package metadata、安装命令、配置项、示例、风险说明、截图或演示。",
		"5. 判断相关性、主分类、标签、安装方式、配置要求、风险限制，并生成 pi-agora 收录记录草稿。",
		"6. 公共收录通常需要一个可访问来源；如果用户没有 GitHub，请建议创建仓库、请维护者代提交，或先生成本地 submission draft，不能假装已经公开发布。",
		"7. 在 pi-agora 仓库中新增或更新 `<分类>/<repo-name>/README.md`，并更新根 README 与分类 README。",
		"8. 运行 `python3 scripts/validate_collection.py`。",
		"9. 只有在用户明确要求时，才提交、push 或协助创建 PR。",
		"",
		"## 如果当前不在 pi-agora 仓库",
		"不要默认修改用户当前项目；如果用户要求整理本地发布材料，可以在其项目内准备 README/metadata 建议或 submission draft。要收录到 pi-agora 时，请指导用户 fork/clone `https://github.com/midastruth/pi-agora`，或生成一份可复制到 PR 的结构化收录记录。",
	].join("\n");
}

export default function piAgora(pi: ExtensionAPI) {
	pi.registerTool({
		name: "pi_agora_search",
		label: "pi-agora Search",
		description: "Search the local pi-agora catalog for extensions, skills, integrations, and workflow tools that match a user's desired capability.",
		promptSnippet: "Search curated Pi extension/skill records by user need, category, tag, or repository name.",
		promptGuidelines: [
			"Use pi_agora_search when the user asks what Pi extension, skill, integration, tool, workflow, notification, or automation capability they should install.",
			"Respond in the user's current language. If the user switches languages, follow the user's language.",
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
					content: [{ type: "text", text: "没有在 pi-agora 中找到匹配项目。可以换更宽泛的关键词再试。" }],
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
		description: "Install a selected Pi extension/package from the local pi-agora catalog by repository name. Always asks for user confirmation before running pi install.",
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

	pi.registerTool({
		name: "pi_agora_publish_guide",
		label: "pi-agora Publish Guide",
		description: "Help users publish or submit their own Pi extension, plugin, skill, or agent capability project to the pi-agora catalog.",
		promptSnippet: "Guide a user through submitting their own Pi extension/skill/capability project to pi-agora.",
		promptGuidelines: [
			"Use pi_agora_publish_guide when the user wants to publish, submit, contribute, list, or add their own Pi extension, plugin, skill, or agent capability project to pi-agora.",
			"Respond in the user's current language. If the user switches languages, follow the user's language.",
			"If the user has a GitHub repository URL, analyze that public project and prepare a pi-agora catalog entry or PR steps.",
			"If the user has no GitHub repository but the current workspace contains Pi extensions or skills, do a read-only local analysis and prepare a publish-ready submission draft; do not claim it is publicly published yet.",
			"If the current workspace is not the pi-agora repository, avoid modifying the user's project unless they explicitly ask for local packaging help; provide fork/clone/PR guidance instead.",
		],
		parameters: Type.Object({
			repositoryUrl: Type.Optional(Type.String({ description: "GitHub repository URL of the user's Pi extension, skill, plugin, or capability project, if available." })),
			projectName: Type.Optional(Type.String({ description: "Project name, if known." })),
			capability: Type.Optional(Type.String({ description: "What capability this project adds to Pi or agent workflows." })),
			localProject: Type.Optional(Type.Boolean({ description: "Set true when the user has no GitHub URL and wants to publish the current local project." })),
		}),
		async execute(_toolCallId, params) {
			return {
				content: [{ type: "text", text: publishGuide(params.repositoryUrl ?? "", params.projectName ?? "", params.capability ?? "", params.localProject ?? false) }],
				details: { repositoryUrl: params.repositoryUrl, projectName: params.projectName, capability: params.capability, localProject: params.localProject },
			};
		},
	});

	pi.registerCommand("pi-agora", {
		description: "启动 pi-agora 扩展/Skill 推荐、安装与发布向导",
		handler: async (args, ctx) => {
			let need = args.trim();
			if (!need && ctx.hasUI) {
				need = (await ctx.ui.input("pi-agora", "你想给 pi 增加什么功能，或想发布/收录自己的扩展？例如：联网搜索、Telegram、代码审查、多代理、发布我的 Skill。"))?.trim() ?? "";
			}

			if (!need) {
				ctx.ui.notify("用法：/pi-agora <功能需求 | 发布/收录我的扩展>", "info");
				return;
			}

			const publishIntent = isPublishIntent(need);
			const prompt = publishIntent ? publisherPrompt(need) : advisorPrompt(need);
			if (ctx.isIdle()) {
				pi.sendUserMessage(prompt);
			} else {
				pi.sendUserMessage(prompt, { deliverAs: "followUp" });
				ctx.ui.notify(publishIntent ? "已排队 pi-agora 发布/收录请求。" : "已排队 pi-agora 推荐请求。", "info");
			}
		},
	});

	pi.registerCommand("pi-agora-publish", {
		description: "帮助把自己的 Pi 扩展 / Skill / 能力增强项目发布或收录到 pi-agora",
		handler: async (args, ctx) => {
			let info = args.trim();
			if (!info && ctx.hasUI) {
				info = (await ctx.ui.input("pi-agora 发布", "请提供 GitHub 仓库链接；如果没有 GitHub，也可以说明当前项目里有哪些 Pi 扩展 / Skill。"))?.trim() ?? "";
			}

			const prompt = publisherPrompt(info || "我没有 GitHub 仓库，请检查当前本地项目是否包含 Pi 扩展 / Skill，并帮助我准备发布材料。");
			if (ctx.isIdle()) {
				pi.sendUserMessage(prompt);
			} else {
				pi.sendUserMessage(prompt, { deliverAs: "followUp" });
				ctx.ui.notify("已排队 pi-agora 发布/收录请求。", "info");
			}
		},
	});

	pi.registerCommand("pi-publish", {
		description: "发布或收录当前本地 Pi 扩展 / Skill 项目到 pi-agora 的快捷入口",
		handler: async (args, ctx) => {
			const info = args.trim() || "我没有 GitHub 仓库，但当前项目里有 Pi 扩展 / Skill；请只读检查本地项目并帮助我准备发布材料。";
			const prompt = publisherPrompt(info);
			if (ctx.isIdle()) {
				pi.sendUserMessage(prompt);
			} else {
				pi.sendUserMessage(prompt, { deliverAs: "followUp" });
				ctx.ui.notify("已排队 pi-agora 本地发布准备请求。", "info");
			}
		},
	});

	pi.on("session_start", async (event, ctx) => {
		if (event.reason !== "startup") return;
		if (process.env.PI_AGORA_AUTO_ONBOARD === "0") return;
		if (!ctx.hasUI) return;

		const config = readConfig();
		if (config.onboarded) {
			ctx.ui.notify("pi-agora 已启用。输入 /pi-agora 查找/安装扩展，或 /pi-agora-publish / /pi-publish 发布收录自己的项目。", "info");
			return;
		}

		writeConfig({ ...config, onboarded: true });
		pi.sendUserMessage([
			{
				type: "text",
				text: [
					"pi-agora 已安装。请作为 Pi 扩展安装与发布向导，使用用户当前使用的语言交流；如果用户切换语言，也跟随切换。",
					"根据当前项目推荐可能有用的 Pi 扩展 / Skills。",
					"先快速了解当前项目上下文，例如 README、package.json、目录结构或已暴露的环境信息；只做只读检查，不要修改文件。",
					"然后调用 pi_agora_search 检索本仓库记录，给出 3 个以内推荐；每个推荐说明为什么适合当前项目、需要什么配置、安装来源以及风险/限制。",
					"如果用户想发布、提交、收录自己的插件、扩展、Skill 或 Pi 能力增强项目，请改走发布流程：优先收集 GitHub 链接；如果用户没有 GitHub 但当前项目包含 Pi extension / Skill，则只读检查本地项目并帮助准备发布材料、收录记录草稿或 PR 步骤。必要时调用 pi_agora_publish_guide。",
					"如果当前项目上下文不足，请先给出可能的能力方向，并用一句话询问我更具体的目标。",
					"等我明确选择要安装的项目后，再调用 pi_agora_install；安装前需要让我确认。",
					"同时告诉我也可以输入 /pi-agora <功能需求> 直接启动推荐，输入 /pi-agora-publish <GitHub 链接> 发布/收录公开项目，或输入 /pi-publish 为没有 GitHub 的本地项目准备发布材料。"
				].join("\n"),
			},
		]);
	});
}
