# pi-skills

- **GitHub**: https://github.com/badlogic/pi-skills
- **主分类**: Utility / Developer Experience 扩展
- **标签**: production-oriented, requires-config, third-party-api, local-only
- **一句话总结**: 一个面向 pi-coding-agent、Claude Code、Codex CLI、Amp、Droid 的通用 skills 仓库，用一组可复用技能补充搜索、浏览器自动化、转录、VS Code diff、Google 工具等能力。

## 功能说明
这不是一个“单一 Pi 扩展”，而是一个 **Pi / agent skills 集合仓库**。仓库按技能目录组织，核心内容是 `SKILL.md` 指令文件，部分技能再配套 Node.js 或 shell 脚本完成实际调用。现有技能覆盖 Brave Search 搜索与内容提取、基于 Chrome DevTools Protocol 的浏览器自动化、Groq Whisper 转录、YouTube transcript 抓取、VS Code diff，以及 Google Calendar / Drive / Gmail CLI 等场景。它的价值在于把常见外部能力整理成现成技能，方便直接安装到多个 agent 生态中复用。

## 适用场景
- 想一次性补充 agent 的搜索、网页操作、转录、diff 等常用能力
- 同时使用 pi-coding-agent、Claude Code、Codex CLI、Amp 或 Droid，希望复用同一批 skills
- 想参考真实技能仓库结构，学习如何组织 `SKILL.md` 与辅助脚本

## 核心机制
- **是否注册 command**: 否，未发现通过 Pi extension API 注册 command
- **是否注册 tool**: 否，仓库主要提供 skills 指令与辅助脚本，不是标准 Pi tool 扩展
- **是否监听 event / hook**: 否，暂未发现事件监听或 hook 扩展实现
- **是否涉及 UI / notify**: 否，未发现 Pi UI / notify 集成
- **是否依赖第三方服务**: 是，部分技能依赖 Brave Search API、Groq API、YouTube transcript、Google CLI、Chrome、VS Code 等外部服务或本地工具

## 安装与使用
- **安装方式**: 以 Git 仓库形式克隆到对应 skills 目录中。`pi-coding-agent` 支持 `~/.pi/agent/skills/pi-skills` 或项目级 `.pi/skills/pi-skills`；Codex CLI、Amp、Droid、Claude Code 也有各自目录约定，其中 Claude Code 需要把每个技能目录单独软链接到 skills 目录下。
- **配置要求**: 视具体技能而定。部分技能需要 `npm install`，部分需要环境变量或全局 CLI，例如 `BRAVE_API_KEY`、`GROQ_API_KEY`、`@mariozechner/gccli`、`@mariozechner/gdcli`、`@mariozechner/gmcli`、Chrome 远程调试、VS Code `code` CLI。
- **基本使用方式**: 安装后由 agent 按 `SKILL.md` 指令调用对应脚本。例如 `brave-search/search.js` 做网页搜索，`browser-tools/*.js` 操作浏览器，`transcribe/transcribe.sh` 进行音频转录，`youtube-transcript/transcript.js` 获取视频字幕。

## 主要内容拆分
### 1. brave-search
- 通过 Brave Search API 做网页搜索与正文提取
- 依赖 Node.js 和 `BRAVE_API_KEY`
- 适合不想启动浏览器时做资料检索

### 2. browser-tools
- 基于 Chrome DevTools Protocol 做可见浏览器自动化
- 支持启动浏览器、导航、执行 JS、截图、元素选择、cookie 查看、正文提取
- 更适合需要真实页面交互、调试登录态、处理动态网页的场景

### 3. transcribe
- 使用 Groq Whisper API 做音频转文字
- 依赖 `GROQ_API_KEY`
- 支持 m4a、mp3、wav、ogg、flac、webm，文件上限 25MB

### 4. youtube-transcript
- 获取 YouTube 视频字幕
- 基于 `youtube-transcript-plus`
- 适合做总结、分析、提取时间轴内容

### 5. vscode
- 利用 VS Code `code -d` 打开文件差异视图
- 更偏辅助型技能，适合人工审查改动

### 6. gccli / gdcli / gmcli
- 分别对应 Google Calendar、Drive、Gmail CLI 能力
- README 提到了依赖全局安装的 CLI
- 当前详细行为还需要进一步阅读各自 `SKILL.md` 与相关工具实现确认

## 值得关注的点
- 一个仓库同时兼容多个 agent 生态，说明 skills 这一抽象具备较好的跨工具复用性。
- 不是只放提示词；多个技能都附带可执行脚本，说明它更偏“可落地的技能包”而非纯说明文档。
- `browser-tools` 提供的流程和效率建议比较完整，作为参考样本很有价值。

## 限制与注意事项
- 严格来说它是 **skills 仓库**，不是典型的 **Pi extension 仓库**；如果资料库只收 extension，需要单独标记这一差异。
- 不同技能的依赖差异较大，安装后不一定开箱即用，通常还要额外配置 API Key、本地 CLI 或浏览器环境。
- 仓库是多个独立技能目录的集合，能力较分散，实际效果取决于宿主 agent 如何发现和执行这些技能。
- 部分 Google 相关技能当前仅从仓库说明中看到入口，若要做更深入记录，还需要继续逐个阅读对应技能文件。

## 适合谁
- 想快速增强 agent 实用能力的人
- 想研究 skills 组织方式和跨 agent 兼容实践的人
- 想把搜索、浏览器自动化、转录等能力做成可复用技能包的人

## 备注
值得收集，但建议长期标注为“Skill Collection / 非单一扩展”。如果后续单独维护 Pi Skills 资料库，这个仓库可以作为高优先级样本。

## 参考依据
本记录主要基于以下内容整理：
- 仓库 `README.md`
- `brave-search/SKILL.md`
- `browser-tools/SKILL.md`
- `transcribe/SKILL.md`
- `youtube-transcript/SKILL.md`
- `vscode/SKILL.md`
- 部分 `package.json`
