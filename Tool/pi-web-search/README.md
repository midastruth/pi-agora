# pi-web-search

- **GitHub**: [https://github.com/ttttmr/pi-web-search](https://github.com/ttttmr/pi-web-search)
- **主分类**: Tool 扩展
- **标签**: `typescript`, `third-party-api`, `requires-config`, `production-oriented`
- **一句话总结**: 为 pi 提供网页搜索与 URL 内容分析工具，底层依赖 Gemini / Google 相关 provider 的搜索与 URL grounding 能力。

## 功能说明
这是一个以工具能力为核心的 Pi 扩展，注册了 `web_search` 和 `url_context` 两个工具。前者可以执行带引用来源的 Web 搜索，也可以把搜索和指定 URL 分析放在一次调用里完成；后者则专门面向 URL 内容理解，支持网页、PDF、图片和 YouTube 视频，最多可同时处理 20 个公开链接。源码中还做了多种 Google provider 的兼容层、流式 SSE 解析、引用插入，以及 URL 拉取成功/失败状态汇总，整体不是简单的 API 包装。

## 适用场景
- 希望给 pi 增加联网搜索能力，并尽量保留来源引用
- 需要让 agent 直接分析外部网页、PDF、图片或 YouTube 内容
- 已经在 pi 中配置 Google / Gemini 相关 provider，想补齐搜索与 URL grounding 能力

## 核心机制
- **是否注册 command**: 否，暂未发现
- **是否注册 tool**: 是；注册了 `web_search` 与 `url_context`
- **是否监听 event / hook**: 否，暂未发现
- **是否涉及 UI / notify**: 否；主要通过工具结果文本和 details 返回内容
- **是否依赖第三方服务**: 是；依赖 Google Gemini API 或兼容 provider（如 `google-antigravity`、`google-gemini-cli`、`google`、`google-generative-ai`）

## 安装与使用
- **安装方式**: `pi install npm:pi-web-search`
- **配置要求**: README 表示无需单独扩展配置，但前提是 pi 中已登录或配置至少一个受支持的 Google / Gemini provider；否则工具无法正常工作
- **基本使用方式**: 安装后 agent 可调用 `web_search` 做联网搜索，也可调用 `url_context` 分析一个或多个公开 URL；当 `web_search` 额外传入 URLs 时，会把“搜索 + URL 分析”合并到同次请求中

## 值得关注的点
- 同时支持搜索与 URL 上下文分析，比单一 search 工具覆盖面更大
- 对多个 Google 生态 provider 做了适配，不只绑定单一 `google-generative-ai`
- 实现了 SSE 流式结果解析，并会把 grounding metadata 转成更易读的引用标记和来源列表
- 对 YouTube URL 做了专门处理，在 Gemini 场景下会转成 `file_data` 形式传入

## 限制与注意事项
- 本质上受限于底层 Gemini / Google provider 的能力与账号配置，不是完全独立的搜索基础设施
- URL 分析要求公开可访问链接，且一次最多 20 个
- 搜索、URL 获取、引用质量都会受到外部服务返回结果影响
- 当前模型选择逻辑明显偏向 Google Flash 系列；如果你的可用模型不在这类 provider 中，扩展价值会下降

## 适合谁
- 想让 pi 原生具备联网检索与网页理解能力的用户
- 已使用 Gemini 生态 provider，希望把 grounding 能力暴露成 pi 工具的开发者
- 想参考一个带多 provider 兼容层的 Pi tool 扩展示例的作者

## 备注
当前判断基于 README、`package.json`、`src/index.ts`、`src/web_search.ts`、`src/url_context.ts`、`src/api.ts`、`src/utils.ts`。虽然它属于第三方服务集成，但对用户最核心的价值仍是“给 agent 新增可调用工具”，因此优先归为 Tool 扩展。
