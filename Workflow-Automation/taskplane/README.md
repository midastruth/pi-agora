# taskplane

- **GitHub**: [https://github.com/HenryLach/taskplane](https://github.com/HenryLach/taskplane)
- **主分类**: Workflow / Automation 扩展
- **标签**: `production-oriented`, `requires-config`, `local-only`, `typescript`
- **一句话总结**: 面向 pi 的多代理任务编排系统，提供任务分波执行、worker/reviewer/supervisor/merger 协作、自动合并和本地可视化 dashboard。

## 功能说明
`taskplane` 不是单一命令或单一工具，而是一整套围绕 **任务编排** 设计的 Pi package。它把“写 spec / 拆 task / 并行执行 / review / merge / 集成”做成可持续运行的工作流：既提供 `taskplane init`、`taskplane doctor`、`taskplane dashboard` 等 CLI，也给 pi 注册 `/orch`、`/orch-plan`、`/orch-status`、`/orch-integrate`、`/taskplane-settings` 等命令，以及一组供 supervisor / worker / reviewer 使用的 orchestration tools。仓库还自带 `create-taskplane-task` skill、任务文件格式、持久化状态、dashboard 和大量测试，明显是成熟度较高的工程化方案。

## 适用场景
- 想把中大型编码任务拆成多个可并行、可恢复、可追踪的 AI 子任务批次
- 需要在 mono-repo 或 polyrepo 中做 worktree 隔离、依赖排序、分阶段 review 与 merge
- 希望让 pi 不只是“单次对话式编码”，而是长期运行的任务执行管线

## 核心机制
- **是否注册 command**: 是；README 与源码可见 `/orch`、`/orch-plan`、`/orch-status`、`/orch-pause`、`/orch-resume`、`/orch-abort`、`/orch-deps`、`/orch-sessions`、`/orch-integrate`、`/taskplane-settings` 等
- **是否注册 tool**: 是；源码中注册了多种 orchestration tools，如 `orch_start`、`orch_status`、`orch_resume`、`orch_abort`、`orch_integrate`、`send_agent_message`、`read_agent_replies`、`list_active_agents` 等
- **是否监听 event / hook**: 需要进一步阅读完整实现逐项确认，但作为完整 orchestrator 扩展，当前可判断其内部状态管理和执行流程明显依赖 Pi 扩展生命周期
- **是否涉及 UI / notify**: 是；包含交互式设置界面与独立本地 web dashboard
- **是否依赖第三方服务**: 不强依赖单一外部 SaaS；主要依赖本地 pi、Git、Node.js，以及你已配置好的模型 provider

## 安装与使用
- **安装方式**: `pi install npm:taskplane`
- **配置要求**: 需要 Node.js 22+、pi、Git；首次通常先在项目内执行 `taskplane init` 生成 `.pi/` 配置、agent prompts、示例任务和 `.gitignore`；还可用 `taskplane doctor` 验证环境
- **基本使用方式**: 在项目完成初始化后，进入 pi 使用 `/orch` 作为主要入口；可先用 `/orch-plan all` 预览 waves / lanes / dependencies，再用 `/orch all` 执行批次；同时可在另一个终端运行 `taskplane dashboard` 查看实时状态

## 值得关注的点
- 不是简单“多开几个 agent”，而是把任务定义、依赖图、批次推进、review、merge、恢复机制串成一整套系统
- 明确支持 mono-repo 和 polyrepo，并强调 repo-aligned segment、worktree 隔离和动态 segment 扩展
- 提供持久化任务格式（如 `PROMPT.md` / `STATUS.md`）来支撑长时运行和上下文恢复，这点很适合复杂任务
- 自带 supervisor、worker、reviewer、merger 四类角色，并支持跨模型 review
- 仓库包含大量文档、规范、dashboard 与测试，工程完成度明显高于普通示例扩展

## 限制与注意事项
- 这类系统上手成本明显高于普通 Pi 扩展，需要先理解 task 格式、orch 分波模型、worktree、dashboard 和配置层
- 强依赖本地 Git 工作流与 worktree 隔离，比较偏开发环境而不是通用聊天场景
- 更适合中大型、可拆解、可验证的任务；对非常小的临时修改来说可能偏重
- 当前判断主要基于 README、`package.json`、`extensions/` 目录结构与命令/工具注册信息；如需更细的实现边界，仍可继续深入各模块文档与源码

## 适合谁
- 想把 pi 用成“任务编排平台”而不仅仅是单代理聊天助手的高级用户
- 需要长期、并行、可恢复执行编码任务的个人开发者或小团队
- 想研究 Pi 大型 workflow/orchestrator 扩展如何设计的开发者

## 备注
仓库同时包含 Pi 扩展、CLI、skill、任务模板和 dashboard。虽然也具备 Utility / Developer Experience 属性，但它最核心的价值仍然是 **任务编排与自动化执行流程**，因此优先归入 Workflow / Automation 扩展。
