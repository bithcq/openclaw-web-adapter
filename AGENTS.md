# AGENTS.md

# web-adapter

- 本仓库是 OpenClaw 外部生态项目，不是 OpenClaw 核心仓库。
- 所有说明、README、提交信息都必须严格区分：已实现 / 计划中 / 未完成。禁止把计划写成已支持。
- 站点相关实现必须放在 `src/adapters/<domain>/<page>/`。
- 优先完成并验证这条主链路：页面识别 → 结构化扫描 → 页面动作 → 动作确认 → watcher。
- 修改公开接口、安装方式、集成方式后，必须同步更新相关文档。
- 完成代码改动后，至少运行：`pnpm test`、`pnpm typecheck`。
- 未经明确要求，不要切分支、不要 `git stash`、不要改无关文件。
- 对外表述时，不要把本项目写成 OpenClaw 官方内建能力或已深度原生集成模块。
