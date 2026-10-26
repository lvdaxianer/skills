# Proposal

## Why

项目启动信息经常只存在于聊天记录或某一个 AI 工具的配置目录中，换电脑、换 Agent 或重新 clone 后容易丢失。需要一个可提交到仓库的、与机器路径无关的项目上下文事实源，并能按不同 Agent 的文件约定重新初始化启动上下文。

## What Changes

- 新增 `project-context-sync` skill，支持初始化、记录、同步、预览和校验项目上下文。
- 约定 `.project-context/` 为项目内可提交的权威事实源。
- 通过 `targets.json` 将上下文同步到 `.claude`、`.codex`、`.kimi` 等 Agent 目录。
- 使用幂等托管区块更新生成文件，不覆盖托管区块外的用户内容。
- 拒绝绝对路径、机器相关路径和疑似敏感信息，保证 clone 到不同电脑后仍可使用。
- 提供标准输出、冲突提示和验证结果，支持重复执行与 clone 后重新初始化。

## Capabilities

### New Capabilities

- `project-context-sync`: 管理仓库内的项目上下文事实源，并将其安全、可移植、幂等地同步到多个 AI Agent 启动文件。

### Modified Capabilities

- 无

## Impact

- 新增一个可独立安装的 skill 目录及其同步/校验工具。
- 新项目会新增 `.project-context/` 目录，并可能按配置生成 `.claude/`、`.codex/`、`.kimi/` 下的共享上下文文件。
- 不新增运行时依赖；工具使用 Python 标准库。
- 不修改现有 skill 的行为或公开 API。
