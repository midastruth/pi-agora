# pi-brain

- **GitHub**: [https://github.com/0xsero/pi-brain](https://github.com/0xsero/pi-brain)
- **主分类**: Integration 扩展
- **标签**: `typescript`, `requires-config`, `third-party-api`, `production-oriented`
- **一句话总结**: 把 Pi 及多种 AI 编码助手的会话导出为可训练数据集，并在本地先做隐私脱敏，再选择导出到 Hugging Face 或自定义 HTTP 目标。

## 功能说明
`pi-brain` 不是单一命令小工具，而是一套“会话读取 → 规范化 → 脱敏 → 可选结构化复审 → 格式化导出 → 上传”的数据处理流水线。仓库里既有可独立使用的 CLI，也有一个较薄的 Pi 扩展层；Pi 内主要提供 `/export`、`/export-local`、`/export-public` 三个命令，底层则复用同一套 TypeScript core。除了 Pi，它还实现了 Claude Code、Codex、OpenCode、Cursor 等来源适配器，目标很明确：把不同 agent 的历史会话整理成更适合训练或归档的数据集，同时尽量先在本地完成隐私清洗。

## 适用场景
- 想把 Pi 或其他 AI coding agent 的历史会话整理成训练数据、分析样本或私有知识资产
- 希望在发布前先做本地脱敏，而不是直接把原始会话上传到外部服务
- 需要一个可复用的跨来源会话抽取框架，后续自己扩展更多 adapter 或上传目标

## 核心机制
- **是否注册 command**: 是；注册 `/export`、`/export-local`、`/export-public`
- **是否注册 tool**: 否；当前未见提供给 agent 直接调用的 tool
- **是否监听 event / hook**: 未明显看到生命周期 hook；主要通过命令触发导出流程
- **是否涉及 UI / notify**: 是；会在 Pi 内使用 TUI 选择器、status、widget 与 notify 展示结果
- **是否依赖第三方服务**: 可选依赖；公开发布可用 Hugging Face 或自定义 HTTP 端点，结构化复审可接 OpenAI-compatible 接口

## 安装与使用
- **安装方式**: 可全局安装 `npm install -g @0xsero/pi-brain`，也可作为 Pi package 安装 `pi install npm:@0xsero/pi-brain`
- **配置要求**: 本地需要存在对应来源的会话目录；如需 `/export-public`，需在 `~/.pi/agent/pi-brain.json` 或环境变量中提供 Hugging Face repo / token；如启用 structured review，还需要额外配置 OpenAI-compatible 接口
- **基本使用方式**: CLI 可用 `pi-brain list`、`pi-brain export pi|claude|codex|opencode|cursor`；在 Pi 中则用 `/export`、`/export-local`、`/export-public` 处理当前会话或全部 Pi 会话

## 值得关注的点
- Pi 扩展部分很薄，但核心库做得比较完整：有来源插件接口、隐私处理、格式转换、上传路由和测试，明显不是只为单一命令临时拼出来的脚本
- 隐私策略较清晰：默认先做本地静态脱敏，再决定是否导出；可选 AI review 只处理**已脱敏后的 chunk**，这一点比“直接把原文丢给模型检查”更稳妥
- 同时支持 `sessions`、`sft-jsonl`、`chatml` 三种导出格式，实用性比“只能导原始 JSONL”更强
- 对 Hugging Face 上传做了两层实现：优先走 Git/LFS，失败时回退 API 提交，工程化完成度不错

## 限制与注意事项
- Pi 内的 slash commands 目前只处理 **Pi 自己的会话**；如果要导出 Claude Code、Codex、OpenCode、Cursor 等来源，需要走 CLI，而不是 Pi 命令
- Cursor 适配器当前依赖预先导出的 JSONL，不是直接读其原始存储；Factory 适配器仍是 stub，尚未真正支持
- 文档明确写了 v1 的若干非目标，例如无实时流式处理、无重 UI、英文模式优先；若你期待更强 NER 或多语言隐私识别，需要继续二次开发
- 如果选择公开上传，即使上传前已脱敏，也仍然要自己评估数据合规性和残余泄漏风险

## 适合谁
- 想把 AI 编码会话沉淀成训练数据集或内部语料的个人开发者 / 研究者
- 希望优先本地脱敏，再决定是否发布到 Hugging Face 的用户
- 想参考“Pi package + 通用 core + 多来源 adapter”这类结构化设计的 Pi 扩展开发者

## 备注
当前判断主要基于仓库 README、`package.json`、`cli.ts`、`plugins/pi/index.ts`、`docs/design.md` 与上传相关核心文件。这个项目虽然在 Pi 里以命令形式使用，但从实际代码结构看，主价值更偏 **多来源会话集成与数据出口能力**，因此优先归入 Integration 扩展。