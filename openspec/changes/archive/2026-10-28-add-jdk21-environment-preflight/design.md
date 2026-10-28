# Design

## Context

`design-to-development` 的后端固定使用 Java 21，但当前启动流程默认本机已经配置好 JDK。预检必须发生在项目生成和需求实现之前，并且要适配常见 macOS、Linux 和 Windows 环境。

## Goals / Non-Goals

**Goals:**

- 在启动阶段明确判断是否存在可用 JDK 21。
- 缺失时使用本机已有且可识别的受信任包管理器自动安装。
- 保留已有 JDK，使用项目/当前进程级 `JAVA_HOME` 和 PATH，避免无谓地改变系统默认 Java。
- 安装后重新验证 `java`、`javac`、主版本和 `JAVA_HOME`，失败时不继续生成代码。
- 让安装结果成为后续 Maven、Spring Boot 和 TDD 验证的可追踪前置条件。

**Non-Goals:**

- 不卸载或覆盖已有 JDK。
- 不通过 `curl | sh`、未知下载地址或未经确认的第三方脚本安装。
- 不自动修改 shell profile、系统注册表或全局 Java 默认值，除非用户明确要求持久化配置。
- 不把 Node、pnpm、Docker 等其他工具的安装混入本次 JDK 预检。

## Decisions

### 1. 检查精确主版本 21

仅 `java -version` 和 `javac -version` 的主版本均为 21 才算通过。JDK 17 或仅有 JRE 均不满足固定后端架构；更高版本也不默认为兼容 JDK 21。

### 2. 按平台选择受信任包管理器

- macOS：优先 Homebrew 的 Temurin 21 cask。
- Debian/Ubuntu：优先 apt 的 OpenJDK 21 JDK 包。
- Fedora/RHEL 系：优先 dnf 的 OpenJDK 21 development kit。
- Arch：使用 pacman 的 JDK 21 包。
- Windows：优先 winget 的 Temurin 21 JDK 包，已有 Chocolatey 时可作为备选。

如果没有可用包管理器或当前权限不足，停止并报告安装入口、权限原因和下一步命令；不要猜测发行版或执行任意远程脚本。

### 3. 安装后只设置当前项目上下文

安装完成后重新解析 JDK 21 的安装路径，并在当前进程/项目启动命令中设置 `JAVA_HOME` 和 PATH。不要自动卸载旧版本或修改全局 profile；这样可以让不同项目并存不同 Java 版本。

### 4. 预检失败是硬门禁

如果安装失败、`javac` 不存在、主版本不是 21、`JAVA_HOME` 无效或 PATH 仍指向其他 Java，必须停止后续工程生成和代码实现，并输出脱敏的命令结果与修复建议。

## Risks / Trade-offs

- [包管理器需要管理员权限] → 直接报告权限失败和可复制的管理员命令，不反复重试。
- [发行版包名不同] → 只使用已识别平台的命令；未知平台进入人工修复路径。
- [系统已有多个 JDK] → 不删除旧版本，安装后显式设置当前项目的 JDK 21 路径并再次验证。
- [安装过程改变 PATH] → 以新 shell/当前进程重新读取并验证，不把安装成功当成环境生效。
- [错误安装脚本或供应链风险] → 只调用本机已存在的受信任包管理器，不执行任意网络脚本。
