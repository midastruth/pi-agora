# pi-diff-review

- **GitHub**: [https://github.com/badlogic/pi-diff-review](https://github.com/badlogic/pi-diff-review)
- **主分类**: Command 扩展
- **标签**: `typescript`, `local-only`, `experimental`
- **一句话总结**: 通过 `/diff-review` 打开一个原生 diff 审查窗口，把代码评审意见整理后直接插回 pi 编辑器。

## 功能说明
这是一个面向本地 Git 仓库的 Pi 命令扩展，核心能力是提供原生 diff review 窗口，而不是直接在终端里做审查。执行 `/diff-review` 后，它会打开基于 Glimpse + Monaco 的本地窗口，支持查看 `git diff`、`last commit` 和 `all files` 三种范围，并在侧边栏中按文件切换。用户可以对旧版本、新版本或整个文件写评论，提交后扩展会把这些评论整理成一段 prompt，直接插入 pi 编辑器，方便继续让模型按反馈修改代码。

## 适用场景
- 想在 pi 工作流里做一次更像代码评审的人工检查
- 希望先看 diff、逐文件写意见，再把反馈交给 pi 处理
- 需要一个比纯终端更适合浏览多文件改动的本地审查界面

## 核心机制
- **是否注册 command**: 是；注册了 `/diff-review`
- **是否注册 tool**: 否，暂未发现
- **是否监听 event / hook**: 是；监听 `session_shutdown` 用于关闭活动窗口
- **是否涉及 UI / notify**: 是；包含原生窗口、终端等待 UI、通知提示、编辑器文本注入
- **是否依赖第三方服务**: 否；不依赖业务 API，但界面依赖 Tailwind 和 Monaco 的 CDN 资源

## 安装与使用
- **安装方式**: `pi install git:https://github.com/badlogic/pi-diff-review`
- **配置要求**: 无单独配置文件；需要在 Git 仓库中运行，且本机具备 Node.js 20+、`pi`，以及 Glimpse 所需运行环境
- **基本使用方式**: 在仓库目录执行 `/diff-review`，打开审查窗口后选择范围、查看文件、写评论并提交；提交结果会被整理成文本并插入当前 pi 编辑器

## 值得关注的点
- 不只是展示 diff，而是把“人工审查 -> 生成反馈 prompt -> 继续交给 pi”串成一个闭环
- 支持按需懒加载文件内容，而不是一次性读取全部内容，适合中等规模仓库
- 同时支持工作区改动、上一提交和全部文件三种视角，覆盖“改动审查”和“整体扫一遍”两类用途
- 会过滤明显的二进制文件和 `.min.js` / `.min.css` 等不适合审查的内容

## 限制与注意事项
- 仓库 README 明确写了作者认为当前实现还比较粗糙，整体更偏实验性
- 依赖原生窗口和 WebView 能力，不是纯终端体验；在某些环境中可用性可能受平台依赖影响
- 需要联网加载 Tailwind 与 Monaco CDN 资源，离线环境下窗口功能可能受影响
- 它生成的是“审查意见 prompt”，不会自动应用修改；仍需要用户或 pi 后续执行变更

## 适合谁
- 想给 pi 增加人工代码评审环节的开发者
- 偏好可视化 diff 审查，而不是只看终端输出的用户
- 想参考 Pi 原生命令 + 本地 GUI 集成方式的扩展开发者

## 备注
当前判断基于 README、`package.json`、`src/index.ts`、`src/git.ts`、`src/prompt.ts`、`src/ui.ts`。虽然它也有较强的 UI 属性，但主要入口和核心使用方式都是 `/diff-review` 命令，因此优先归为 Command 扩展。
