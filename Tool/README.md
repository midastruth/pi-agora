# Tool 扩展

这个目录收录以“向 AI 提供可调用工具能力”为核心的 Pi 扩展。

## 已收录
- [pi-model-switch](./pi-model-switch/) - 为 agent 提供 `switch_model` 工具，可列出、搜索并切换当前会话模型
- [pi-web-search](./pi-web-search/) - 提供 `web_search` 与 `url_context` 工具，支持联网搜索、URL 分析与引用来源输出
- [pi-design-deck](./pi-design-deck/) - 为 agent 提供 `design_deck` 工具，以多幻灯片可视化决策面板呈现多个方案选项，用户选择后将结果返回给 agent
- [pi-vent](./pi-vent/) - 注册 `vent` 工具，把 agent 遇到的重大摩擦与复盘反馈追加到本地 `VENT.md`
- [pi-live-terminal](./pi-live-terminal/) - 提供 `live_terminal_run` / `live_terminal_close` 工具，把长任务或交互式命令放进 tmux 并在 Pi 中实时显示
