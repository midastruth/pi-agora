# pi-live-terminal

- **GitHub**: https://github.com/tanishqkancharla/pi-live-terminal
- **主分类**: Tool 扩展
- **标签**: `typescript`, `local-only`, `production-oriented`
- **一句话总结**: 为 agent 提供 `live_terminal_run` / `live_terminal_close` 工具，把长时间运行或交互式命令放进 tmux，并在 Pi 界面中实时显示终端输出。

## 功能说明

`pi-live-terminal` 用 tmux 承载长时间运行、watch mode、开发服务器或交互式命令，并把终端输出嵌入到 Pi 编辑器上方的 live widget。agent 可通过工具启动和关闭会话，用户也可通过 slash command 或快捷键运行、聚焦、附着和关闭 tmux 会话。它解决的是普通 shell 工具不适合处理长任务、全屏 TUI 或需要用户实时观察 / 接管输入的问题。

## 适用场景

- 启动开发服务器、测试 watch、构建任务等持续输出的命令
- 运行需要用户观察或临时接管输入的 TUI / 交互式程序
- agent 需要立即返回控制权，同时让用户持续看到命令进展
- Pi 会话重启后，希望重新附着到仍存在的 tmux 会话

## 核心机制

- **是否注册 command**: 是，`/live-terminal:run`、`/live-terminal:attach`、`/live-terminal:focus`、`/live-terminal:close`
- **是否注册 tool**: 是，`live_terminal_run` 和 `live_terminal_close`
- **是否监听 event / hook**: 是，监听 `session_start`，从会话历史中恢复并重新附着仍存在的 tmux pane
- **是否涉及 UI / notify**: 是，注册编辑器上方 widget、全屏 focus modal、快捷键和通知；快捷键包括 `ctrl+shift+f`、`ctrl+shift+x`、`ctrl+shift+v`
- **是否依赖第三方服务**: 否；但依赖本机已安装 `tmux`

## 安装与使用

- **安装方式**:
  ```bash
  pi install npm:pi-live-terminal
  ```
  安装或更新后需要重启 Pi。
- **配置要求**: 无外部服务配置；本机需要安装 `tmux`，并运行在支持 Pi extension runtime / TUI 的环境中。
- **基本使用方式**:
  - agent 自动调用 `live_terminal_run({ command })` 启动命令，完成后用 `live_terminal_close` 关闭并 kill 会话
  - 用户可手动执行 `/live-terminal:run <shell-command>`
  - `/live-terminal:attach <session-target> [title]` 可附着到已有 tmux 会话
  - `ctrl+shift+f` 聚焦到可交互的全屏 modal，`ctrl+shift+x` kill，会话完成后可用 `ctrl+shift+v` 关闭 widget

## 值得关注的点

- 把“agent 启动命令”和“用户实时观察 / 接管终端”合并到同一个 Pi widget，适合替代普通 bash 处理长任务
- 工具返回 tmux session / pane 信息后立即让 agent 继续工作，不必等待命令自然结束
- 通过 tmux pane option 记录退出状态，并在完成时向用户和 agent 会话写入状态信息
- 支持会话恢复：Pi session 重启后，如果 tmux target 仍存在，会自动重新显示 widget
- 可以附着已有 tmux session，不局限于本扩展创建的会话

## 限制与注意事项

- 依赖本机 `tmux`；没有 tmux 的环境无法使用
- 工具会执行任意 shell 命令，安全性取决于 agent 权限与用户确认策略
- 当前实现维护一个 `currentAttachment`，更适合一次关注一个 live terminal，而不是同时管理多个 widget
- 命令结束后 wrapper 会 `sleep 300` 保留 pane 供查看，需主动关闭或等待清理
- 主要价值依赖 Pi 的 UI / TUI 能力；无 UI 场景下只能得到工具返回信息，live widget 价值会降低

## 适合谁

- 经常让 agent 启动 dev server、watch test、构建或长时间脚本的 Pi 用户
- 希望在 agent 运行命令时实时看到输出，并能必要时接管键盘输入的用户
- 想为 Pi 增加本地终端交互能力、但不需要对接云服务的开发者

## 备注

当前判断基于 README、`package.json` 与 `pi-live-terminal.ts`。这是标准 Pi extension package，`package.json` 通过 `pi.extensions` 暴露入口文件。
