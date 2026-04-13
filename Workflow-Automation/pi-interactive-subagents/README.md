# pi-interactive-subagents

- **GitHub**: [https://github.com/HazAT/pi-interactive-subagents](https://github.com/HazAT/pi-interactive-subagents)
- **主分类**: Workflow / Automation 扩展
- **标签**: `typescript`, `local-only`, `production-oriented`, `requires-config`
- **一句话总结**: 为 pi 提供可异步运行的子代理编排能力，可在多路复用终端窗格中并行执行 subagent，并把结果异步回灌到主会话。

## 功能说明
这是一个明显以“多代理编排”与“流程自动化” 为核心的 Pi 扩展包，而不只是单一工具。它一方面提供 `subagent`、`subagents_list`、`set_tab_title`、`subagent_resume` 等能力，让主 agent 可以启动、查看、恢复子代理；另一方面又配套 `/plan`、`/iterate`、`/subagent` 命令、会话级状态 widget、结果回灌消息渲染，以及 `write_artifact` / `read_artifact` 两个 session artifact 工具，用于在主代理与子代理之间传递计划、上下文、研究记录等文件。仓库还内置了 planner、scout、worker、reviewer、visual-tester 等角色定义，整体上已经是一套可实际使用的 subagent orchestration 方案。

## 适用场景
- 希望把复杂任务拆给多个子代理并行处理，同时保持主会话可继续工作
- 想在 pi 中建立“调研 → 规划 → 实施 → 评审”这类多阶段自动化流程
- 需要让不同角色代理使用不同模型、工具权限、工作目录和 system prompt

## 核心机制
- **是否注册 command**: 是；至少包含 `/plan`、`/iterate`、`/subagent`
- **是否注册 tool**: 是；至少包含 `subagent`、`subagents_list`、`set_tab_title`、`subagent_resume`、`write_artifact`、`read_artifact`，README 还提到子代理上下文中的 `caller_ping`
- **是否监听 event / hook**: 是；监听 `session_start`、`session_shutdown` 等事件，用于维护 widget、清理子代理状态等
- **是否涉及 UI / notify**: 是；包含上方 widget、消息渲染器、进度标题更新、可展开的完成/求助通知
- **是否依赖第三方服务**: 主要不依赖业务 API；但依赖本地终端多路复用环境（cmux / tmux / zellij / WezTerm）以及用户已配置的模型 provider

## 安装与使用
- **安装方式**: `pi install git:github.com/HazAT/pi-interactive-subagents`
- **配置要求**: 需要在受支持的多路复用终端中运行 pi，例如 cmux、tmux、zellij 或 WezTerm；可选设置 `PI_SUBAGENT_MUX` 强制指定后端；如需自定义角色，可在项目 `.pi/agents/` 或全局 `~/.pi/agent/agents/` 中定义 agent markdown 文件
- **基本使用方式**: 安装后，agent 可通过 `subagent()` 异步启动子代理；用户也可直接使用 `/plan` 启动完整规划工作流、用 `/iterate` fork 当前会话做快速修复，或用 `/subagent <agent> <task>` 直接拉起某个命名代理。子代理完成后，结果会以 steer message 方式异步送回主会话

## 值得关注的点
- 核心设计是 **非阻塞异步子代理**：`subagent()` 立即返回，主会话不中断，结果完成后再异步回灌
- 不只是开子进程，而是完整实现了会话文件管理、pane/surface 管理、进度 widget、结果消息渲染和恢复执行
- 通过 frontmatter 支持 agent 级模型、thinking、tools、skills、cwd、deny-tools、auto-exit、system prompt 模式等控制，灵活度很高
- `write_artifact` / `read_artifact` 让多代理协作不必直接依赖项目工作文件，适合计划、上下文、研究产物的跨会话共享
- 自带 planner / scout / worker / reviewer / visual-tester 等角色，开箱即用程度较高

## 限制与注意事项
- 强依赖本地多路复用终端环境；如果不在 cmux、tmux、zellij 或 WezTerm 中运行，核心能力无法使用
- 这是偏本地工作站式的编排方案，不是云端托管型多代理服务
- 整体概念较多：subagent、artifact、resume、agent frontmatter、tool denylist、cwd 隔离等，对新手有一定上手成本
- 角色能力和工作流质量仍然依赖底层模型配置，以及你是否为项目准备了合适的 agent 定义和技能

## 适合谁
- 想把 pi 从单代理使用方式升级为多代理协作工作流的高级用户
- 需要长期维护“规划、执行、复查”流水线的个人开发者或小团队
- 想研究 Pi 子代理编排、异步结果回流、会话 artifact 共享等实现方式的扩展开发者

## 备注
当前判断基于 README、`package.json`、`pi-extension/subagents/index.ts`、`pi-extension/session-artifacts/index.ts` 以及内置 agent 定义。虽然它也注册了不少 tools 和 commands，但仓库最核心的价值是“编排多个代理完成多步骤流程”，因此优先归为 Workflow / Automation 扩展。
