# pi-codex-conversion

- **GitHub**: https://github.com/IgorWarzocha/pi-codex-conversion
- **主分类**: Tool 扩展
- **标签**: `typescript`, `requires-config`, `third-party-api`, `production-oriented`
- **一句话总结**: 将 Pi 在 Codex / GPT 类模型下的工具、提示词、执行渲染与 OpenAI Codex Responses provider 改造成更接近 Codex CLI 的工作方式。

## 功能说明

`pi-codex-conversion` 是一个 Codex-oriented 的 Pi adapter。启用后，它会在 Codex-like 模型中替换默认 `read` / `bash` / `edit` / `write` 工具面，改为 `exec_command`、`write_stdin`、`apply_patch`、`web_search`、`image_generation`、`view_image` 等 Codex 风格工具，并对系统提示词追加 Codex 使用习惯。它还注册 `openai-codex` provider，把 web search 和 image generation 转成 OpenAI Codex Responses 的原生工具调用，同时把执行、补丁、搜索和图片生成结果用更接近 Codex 的 UI 形式展示。

## 适用场景

- 希望在 Pi 中使用更接近 Codex CLI / Codex Responses 的工具调用语义
- 想让 GPT / Codex 类模型优先用 shell 搜索与 `apply_patch` 修改文件，而不是 Pi 默认读写工具
- 需要在 Pi 中接入 OpenAI Codex Responses 的原生 web search 或 image generation
- 希望长命令、交互式命令、patch 结果以 Codex 风格在 TUI 中折叠 / 展示

## 核心机制

- **是否注册 command**: 否，当前未发现 slash command 注册
- **是否注册 tool**: 是，注册 `exec_command`、`write_stdin`、`apply_patch`、`web_search`、`image_generation`、`view_image`
- **是否监听 event / hook**: 是，监听 `session_start`、`model_select`、`message_start`、`tool_execution_start`、`tool_execution_end`、`before_agent_start`、`before_provider_request`、`context`、`session_shutdown`、`agent_end` 等事件，用于切换工具、改写 prompt / provider payload、维护执行状态与清理会话
- **是否涉及 UI / notify**: 是，设置底部状态 `Codex adapter`，注册工具渲染与自定义消息 renderer，展示 exec / patch / web search / image generation 状态和图片预览
- **是否依赖第三方服务**: 是，`openai-codex` provider 对接 ChatGPT / OpenAI Codex Responses 后端；本地执行还依赖 Node runtime 和 `node-pty`

## 安装与使用

- **安装方式**:
  ```bash
  pi install npm:@howaboua/pi-codex-conversion
  # 或
  pi install git:github.com/IgorWarzocha/pi-codex-conversion
  # 本地开发
  pi install ./pi-codex-conversion
  ```
- **配置要求**: 需要 Pi `0.74.x` 相关包；`openai-codex` 原生 web search / image generation 需要可用的 OpenAI / ChatGPT Codex 凭据。`package.json` 标明支持 Linux / macOS。
- **基本使用方式**: 安装后在 Pi 中选择 OpenAI GPT / Codex-like 模型时自动启用 adapter；切换到非 Codex-like 模型时会恢复之前的 active tools。生成图片会保存到工作区 `.pi/openai-codex-images/`，并同步最新图片到 `.pi/openai-codex-images/latest.png`。

## 值得关注的点

- 不是简单新增单个工具，而是成套替换 Codex-like 模型下的工具面、prompt 行为和结果渲染
- `exec_command` / `write_stdin` 使用 PTY-backed session manager，支持长任务、交互式进程、轮询和继续输入
- `apply_patch` 自带 patch 解析、路径限制、部分失败处理与 Codex 风格 diff 展示
- 对 `openai-codex` provider 做了原生 tool payload 重写，web search / image generation 不走本地假工具执行
- 图片生成结果会落盘并在 Pi UI 中预览，便于后续 `view_image` 或人工查看
- 仓库包含较完整的 TypeScript 单元测试，覆盖工具注册、provider 转换、patch、shell summary 等关键逻辑

## 限制与注意事项

- 会改变 Codex-like 模型下的默认工具集合；习惯 Pi 原生 `read` / `edit` / `write` 的用户需要适应
- `web_search` 和 `image_generation` 只在 `openai-codex` provider / 支持模型上可用，本地执行会报错
- 对 ChatGPT / Codex 后端的鉴权、额度、接口稳定性有依赖；README 提到用量限制会转成友好错误
- `apply_patch` 路径被限制在当前工作目录内，这是安全设计，但也意味着不能直接编辑工作区外文件
- `node-pty` 等依赖可能受运行平台、Node 版本或本机编译环境影响

## 适合谁

- 想在 Pi 中获得 Codex CLI 类体验的 OpenAI / Codex 模型用户
- 需要把 Pi 默认工具面收窄为 shell + patch 工作流的 coding agent 用户
- 想研究 Pi provider、tool、event hook、message renderer 综合扩展写法的开发者

## 备注

当前判断基于 README、`package.json`、`src/index.ts`、`src/tools/`、`src/providers/openai-codex-custom-provider.ts` 与测试目录。该仓库是标准 Pi package，`package.json` 通过 `pi.extensions` 暴露 `./src/index.ts`。
