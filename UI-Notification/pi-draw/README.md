# pi-draw

- **GitHub**: [https://github.com/mitsuhiko/pi-draw](https://github.com/mitsuhiko/pi-draw)
- **主分类**: UI / Notification 扩展
- **标签**: `typescript`, `local-only`, `requires-browser`, `third-party-cdn`
- **一句话总结**: 在 Pi 中通过 `/draw` 或快捷键打开 tldraw 画布，并把绘图导出为 PNG 附加到当前 prompt。

## 功能说明
pi-draw 是一个面向视觉表达的 Pi 扩展，用来快速画草图、流程图、界面示意或结构关系图。它会在本机启动一个只监听 `127.0.0.1` 的临时 HTTP 服务，打开浏览器中的 tldraw 无限画布；用户点击 **Submit to Pi** 后，当前画布会被导出成 PNG 保存到 `/tmp`，并以 `@/tmp/...png` 的形式插入当前 Pi 输入框。它解决的是“文字描述不够直观，需要临时画图给模型看”的场景。

## 适用场景
- 需要给 agent 补充 UI 草图、架构图、流程图或空间关系图。
- 讨论前端布局、产品交互、图形问题、白板推理等视觉任务。
- 终端不方便直接附图，但希望快速生成一张临时图片作为 prompt attachment。

## 核心机制
- **是否注册 command**: 是，注册 `/draw` 用于打开绘图画布。
- **是否注册 tool**: 否，未向 agent 注册可调用工具。
- **是否监听 event / hook**: 是，监听 `session_start` 保存上下文，监听 `session_shutdown` 关闭本地服务。
- **是否涉及 UI / notify**: 是，使用 `ctx.ui.notify`、`ctx.ui.setStatus`、`ctx.ui.getEditorText`、`ctx.ui.setEditorText` 反馈状态并修改当前输入框。
- **是否依赖第三方服务**: 不依赖第三方 API；但前端页面从公共 CDN 加载 `tldraw`、`React`、`React DOM`。

## 安装与使用
- **安装方式**:

```bash
pi install https://github.com/mitsuhiko/pi-draw
```

本地开发可使用：

```bash
pi -e ./draw.ts
# 或
pi install .
```

- **配置要求**: README 未说明额外配置；需要本机可打开浏览器，并能访问 `esm.sh` / `unpkg.com` CDN 加载前端资源。
- **基本使用方式**: 按 `Ctrl+Shift+C` 或运行 `/draw` 打开画布；绘制完成后点击 **Submit to Pi**，扩展会保存 PNG 到 `/tmp/pi-draw-*.png` 并把 `@路径` 插入当前 prompt。

## 值得关注的点
- 交互链路很短：打开画布 → 画图 → 一键附加到当前 prompt。
- 本地服务懒启动，绑定 `127.0.0.1` 随机端口，并使用 token 限制访问。
- 浏览器窗口可以保持打开，多次点击提交会持续向当前 prompt 注入新的截图路径。
- 上传端有 PNG 校验与 50MB 大小限制，截图文件权限设置为 `0600`。

## 限制与注意事项
- 画布 UI 依赖公网 CDN；离线环境或网络受限环境可能无法使用。
- 图片保存到 `/tmp`，属于临时文件，系统清理后可能不可用。
- 只支持把 tldraw 当前页导出为 PNG；没有发现对 SVG、PDF 或多页导出的支持。
- `Ctrl+Shift+C` 在部分终端可能被拦截，此时需要使用 `/draw`。

## 适合谁
- 经常需要用草图辅助说明问题的 Pi 用户。
- 做 UI、产品、架构、流程讨论时希望快速把图像上下文交给模型的人。
- 想参考 Pi 扩展如何结合本地 HTTP 服务、浏览器 UI 和编辑器输入框操作的开发者。

## 备注
当前判断基于 README、`package.json` 与 `draw.ts` 源码。该项目更像“视觉输入 UI 扩展”，虽然提供 `/draw` 命令，但核心价值在外部画布 UI 与 prompt 图片附件流程。
