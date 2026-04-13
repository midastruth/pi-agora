# pi-telegram

- **GitHub**: [https://github.com/badlogic/pi-telegram](https://github.com/badlogic/pi-telegram)
- **主分类**: Integration 扩展
- **标签**: `typescript`, `requires-config`, `third-party-api`, `production-oriented`
- **一句话总结**: 把 Telegram 私聊机器人接到当前 pi 会话上，让用户可以直接通过 Telegram 与 pi 对话、发文件、收文件。

## 功能说明
这是一个面向 Telegram 私聊场景的 Pi 扩展，本质上是一个 **Telegram DM bridge**。它会通过 Telegram Bot API 轮询私聊消息，把文本、图片、文件转发给 pi，并把 pi 的回复流式回传到 Telegram。源码里还额外实现了文件下载、图片输入转发、排队处理、停止当前运行、会话状态查询，以及 `telegram_attach` 工具，方便 pi 把本地生成文件作为附件回传给 Telegram 用户。

## 适用场景
- 想把本地或当前终端里的 pi 会话临时暴露到 Telegram 私聊中
- 需要在手机上远程给 pi 发图片、文件、文本，再拿回生成结果
- 希望把 Telegram 作为一个轻量级“远程前端”，而不是另做完整 Web UI

## 核心机制
- **是否注册 command**: 是；注册了 `telegram-setup`、`telegram-connect`、`telegram-disconnect`、`telegram-status`
- **是否注册 tool**: 是；注册了 `telegram_attach`，用于把本地文件加入下一条 Telegram 回复的附件队列
- **是否监听 event / hook**: 是；监听 `session_start`、`session_shutdown`、`before_agent_start`、`agent_start`、`message_start`、`message_update`、`agent_end`
- **是否涉及 UI / notify**: 是；会更新状态栏并通过 UI 通知提示配置状态
- **是否依赖第三方服务**: 是；依赖 Telegram Bot API

## 安装与使用
- **安装方式**: `pi install git:github.com/badlogic/pi-telegram`，或单次运行 `pi -e git:github.com/badlogic/pi-telegram`
- **配置要求**: 需要先在 Telegram 的 `@BotFather` 创建机器人并拿到 bot token；配置通过 `/telegram-setup` 输入，保存到 `~/.pi/agent/telegram.json`
- **基本使用方式**: 在目标 pi 会话中执行 `/telegram-connect` 启动桥接；首次向机器人私聊 `/start` 的 Telegram 用户会被绑定为唯一允许用户；之后即可在私聊中发送文本、图片、相册和文件，与当前 pi 会话交互

## 值得关注的点
- 不只是“收发文本”，还处理了图片输入、文档下载、本地临时文件保存和附件回传，完成度较高
- 支持把 Telegram 新消息排队，避免 pi 忙碌时消息直接丢失
- 支持流式预览回复，优先尝试 Telegram draft streaming，失败时回退到 `sendMessage + editMessageText`
- 通过 `before_agent_start` 注入系统提示，明确要求模型在需要回传文件时使用 `telegram_attach`，设计比较贴近实际使用

## 限制与注意事项
- 这是**会话级**桥接；同一个 bot 只应连接到一个 pi 会话，否则容易出现冲突
- 默认只接受首个完成配对的 Telegram 私聊用户，明显偏向单用户、自用场景
- 依赖长轮询和本地运行中的 pi 进程，不是独立部署后即可持续在线的托管服务
- Telegram 文件会下载到 `~/.pi/agent/tmp/telegram`，涉及本地磁盘与隐私数据时需要自行注意清理和权限

## 适合谁
- 想快速把 pi 接到 Telegram 上远程使用的个人开发者
- 需要在手机端给 pi 发图、发文件、拿回生成产物的用户
- 想参考一个较完整第三方 IM 集成实现方式的 Pi 扩展开发者

## 备注
当前判断基于仓库 README、`package.json` 与单文件主实现 `index.ts`。仓库结构很小，但主逻辑集中、可读性高，值得收录为 Telegram 集成参考案例。
