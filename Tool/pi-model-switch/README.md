# pi-model-switch

- **GitHub**: [https://github.com/nicobailon/pi-model-switch](https://github.com/nicobailon/pi-model-switch)
- **主分类**: Tool 扩展
- **标签**: `typescript`, `minimal`, `requires-config`
- **一句话总结**: 给 pi 增加一个 `switch_model` 工具，让模型自己列出、搜索并切换当前会话所用模型。

## 功能说明
这是一个非常聚焦的 Pi 工具扩展，核心能力只有一件事：把“模型切换”暴露成可由 agent 自主调用的工具。安装后，agent 可以根据用户自然语言请求执行列出模型、按关键词搜索模型、切换到指定模型等操作，不再只能依赖 `/model` 命令或手动快捷键。源码还支持可选的 `aliases.json` 别名映射，用于把 `cheap`、`coding`、`budget` 之类偏策略化的名称解析成具体模型或候选链。

## 适用场景
- 希望让 pi 根据任务类型自动换模型，而不是手动切换
- 想在 `AGENTS.md` 中写入模型选择策略，例如“需求澄清用便宜模型，编码用更强模型”
- 有多个 provider / model 已配置好，想让 agent 自己做查找与切换

## 核心机制
- **是否注册 command**: 否，暂未发现
- **是否注册 tool**: 是；注册了 `switch_model`
- **是否监听 event / hook**: 否，暂未发现
- **是否涉及 UI / notify**: 否；主要通过工具文本结果返回信息
- **是否依赖第三方服务**: 间接依赖；本扩展本身不直接请求外部 API，但实际可用模型取决于 pi 已配置好的 provider 与 API key

## 安装与使用
- **安装方式**: `pi install npm:pi-model-switch`，安装后需重启 Pi
- **配置要求**: 至少需要在 pi 中预先配置可用模型与对应 API key；可选地在 `~/.pi/agent/extensions/model-switch/aliases.json` 中定义模型别名和候选链
- **基本使用方式**: 安装后 agent 会获得 `switch_model` 工具；可以直接对 agent 说“list available models”“switch to a cheaper model”“use Claude for this task”等，让它自行列出、搜索或切换模型

## 值得关注的点
- 实现很小，但解决的是一个高频交互痛点：把“切模型”从人工操作变成 agent 可调用能力
- 支持别名和 fallback chain，例如一个 `budget` 别名可映射到多个候选模型，按可用性依次尝试
- README 明确给出了 `AGENTS.md` 写法，适合把模型切换纳入更长的工作流策略中
- 工具描述和 promptSnippet 写得比较完整，明显是在增强 agent 自主触发该工具的概率

## 限制与注意事项
- 它不会凭空增加模型能力；前提仍是你已经在 pi 中配置好了可用 provider 和 API key
- `switch` 的模糊匹配如果命中多个模型，会直接要求更具体的搜索词
- 别名文件放在扩展目录中，如果路径变化或 JSON 格式错误，会影响 alias 功能
- 当前能力集中在模型列出、搜索、切换，本身不负责更复杂的策略编排或自动回退逻辑之外的治理

## 适合谁
- 已经配置多个模型、希望让 pi 自己选择模型的用户
- 想把“便宜 / 快速 / 编码 / 视觉”这类偏策略需求写进 `AGENTS.md` 的开发者
- 想参考一个小而实用的 Pi tool 扩展示例的作者

## 备注
当前判断基于 README、`package.json`、`index.ts` 与 `CHANGELOG.md`。仓库结构极简，但定位非常清楚：这是一个典型的 Tool 扩展，而不是 command 或 workflow 项目。
