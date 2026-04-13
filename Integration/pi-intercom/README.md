# pi-intercom

- **GitHub**: [https://github.com/nicobailon/pi-intercom](https://github.com/nicobailon/pi-intercom)
- **主分类**: Integration 扩展
- **标签**: `typescript`, `local-only`, `requires-config`, `production-oriented`
- **一句话总结**: 让同一台机器上的多个 pi 会话通过本地 broker 做 1:1 直接通信，既可用户手动发消息，也可让 agent 彼此协作。

## 功能说明
这是一个面向 **pi 会话间通信** 的扩展，核心目标不是接入外部 SaaS，而是把同机多个 pi session 连接成一个可直接互发消息的小型通信网络。它提供 `intercom` 工具用于列出会话、发送消息、等待回复和查询状态，也提供 `/intercom` 命令与 `Alt+M` 快捷键打开会话选择/消息编写 overlay。底层通过 Unix socket 上的本地 broker 维护会话注册与消息路由，支持 reply hint、同步 `ask` 等待回复、附件内容传递、inline 消息渲染，以及把消息写入 Pi session history。

## 适用场景
- 同时开着多个 pi 会话，想在不同会话之间手动传递上下文、发现和任务
- 想让一个 agent 向另一个本地会话求助、提问或转交结果
- 与 subagent / planner-worker 之类工作流配合，做更明确的 1:1 定向协作

## 核心机制
- **是否注册 command**: 是；注册了 `/intercom`
- **是否注册 tool**: 是；注册了 `intercom`，支持 `list`、`send`、`ask`、`status`
- **是否监听 event / hook**: 是；监听 `session_start`、`session_shutdown`、`turn_end`、`agent_end`、`model_select`
- **是否涉及 UI / notify**: 是；包含会话列表 overlay、消息编写 overlay、inline 消息渲染与快捷键 `Alt+M`
- **是否依赖第三方服务**: 否；不依赖外部云服务，但依赖本机 Unix socket broker 与本地运行的其他 pi 会话

## 安装与使用
- **安装方式**: `pi install npm:pi-intercom`
- **配置要求**: 安装后重启 Pi；可选配置文件为 `~/.pi/agent/intercom/config.json`，支持 `confirmSend`、`enabled`、`replyHint`、`status`
- **基本使用方式**: 扩展在会话启动时自动连接或拉起本地 broker；用户可按 `Alt+M` 或执行 `/intercom` 选择目标会话并发消息；agent 也可通过 `intercom({ action: "send" | "ask" | "list" | "status" })` 与其他会话通信

## 值得关注的点
- 核心定位很清楚：不是广播聊天室，而是 **定向 1:1 session messaging**
- `ask` 模式很实用：发送后阻塞等待对方回复，回复会直接作为工具结果回到当前 turn 中
- 自动处理同名会话歧义、reply hint、送达失败、断线、超时和会话列表请求关联，细节完成度高
- 收到消息后不仅展示在 UI 中，还能触发新 turn，并写入 session history，便于 agent 真正“感知”通信内容
- 与 `pi-subagents` 一类项目配合价值很高，适合做 planner / worker / reviewer 间的定向交接

## 限制与注意事项
- 只支持**同一台机器**上的会话通信；设计上就是 local-only，不支持跨网络
- 只有加载并成功连接 `pi-intercom` 的会话才会出现在列表里，不是所有打开的 Pi 进程都能被发现
- compose overlay 暂未提供附件 UI；虽然协议支持附件，但手动界面能力仍有限
- 如果 broker 在连接后异常退出，当前会话不会自动完全恢复到连接状态，通常需要重启会话重新接入

## 适合谁
- 同时使用多个本地 pi 会话并希望它们能互通的高级用户
- 想把多会话协作做得更明确、可控，而不是依赖共享上下文的开发者
- 想参考 Pi 本地 IPC / broker / 多会话消息路由实现方式的扩展作者

## 备注
当前判断基于 README、`index.ts`、`config.ts`、`broker/broker.ts` 与 `CHANGELOG.md`。虽然它也有明显的 tool 和 UI 特征，但最核心的价值是“把多个本地 pi 会话接到一个通信层里”，因此优先归为 Integration 扩展。
