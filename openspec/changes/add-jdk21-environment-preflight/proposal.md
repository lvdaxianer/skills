# Proposal

## Why

固定后端架构要求 JDK 21，但 Skill 当前没有在启动阶段检查或修复本机 Java 环境，可能导致工程生成后才发现版本错误。需要把 JDK 21 预检和可恢复的自动安装纳入 Skill 启动流程，保证后续 brainstorming、TDD 和构建使用正确运行时。

## What Changes

- 在 Skill 启动阶段增加 JDK 21 环境预检。
- 检查 `java`、`javac`、Java 主版本和 `JAVA_HOME` 是否指向可用 JDK 21。
- 缺少 JDK 21 时，按操作系统和已有包管理器自动安装，不卸载已有 JDK。
- 安装后为当前项目/进程配置并验证 `JAVA_HOME`、PATH、`java -version` 和 `javac -version`。
- 没有可用安装入口或安装失败时停止后续开发并报告可执行的修复信息。
- 增加环境预检参考资料、质量门禁和评测用例。

## Capabilities

### New Capabilities

- `jdk21-environment-preflight`: 在 Skill 启动时检查、安装和验证 JDK 21，并在无法恢复时安全停止。

### Modified Capabilities

无。

## Impact

- 修改 `design-to-development/SKILL.md`、workflow/quality-gates references 和 evals。
- 新增环境预检 reference 和 OpenSpec 主规格。
- Skill 运行时可能调用本机受信任包管理器安装 JDK 21；不删除已有 JDK，不下载或执行未知脚本。
