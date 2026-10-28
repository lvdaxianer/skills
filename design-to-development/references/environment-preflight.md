# JDK 21 环境预检参考

本参考文件用于 `design-to-development` 启动阶段。必须在需求讨论、头脑风暴、工程生成和任何代码修改之前执行。预检的目标是保证后端构建使用完整的 JDK 21，而不是仅有 JRE 或其他 Java 版本。

## 1. 通过条件

只有同时满足以下条件，才能进入需求分析和开发阶段：

- `java` 命令可用。
- `javac` 命令可用；只有 JRE 不算通过。
- `java -version` 和 `javac -version` 的主版本均为 21。
- `JAVA_HOME` 指向同一套 JDK 21，并且其 `bin/java`、`bin/javac` 可执行。
- 当前项目进程的 `PATH` 能够找到上述 JDK 21 的 `java` 与 `javac`。

只安装了 Java 17、Java 22 或其他版本时，仍然视为未通过。不要因为系统中存在更高版本就跳过 JDK 21 检查。

### POSIX 检查

在 macOS、Linux 或其他 POSIX shell 中执行：

```sh
java -version 2>&1 | sed -n '1p'
javac -version 2>&1
test -n "$JAVA_HOME"
test -x "$JAVA_HOME/bin/java"
test -x "$JAVA_HOME/bin/javac"
```

读取输出并确认主版本是 `21`。不要只判断命令退出码；还要确认 `JAVA_HOME` 与命令实际使用的是同一套 JDK。

### PowerShell 检查

在 Windows PowerShell 中执行：

```powershell
java -version 2>&1
javac -version 2>&1
Test-Path "$env:JAVA_HOME\bin\java.exe"
Test-Path "$env:JAVA_HOME\bin\javac.exe"
```

读取输出并确认主版本是 `21`。`JAVA_HOME` 为空、指向旧版本或只包含 `java.exe` 而没有 `javac.exe` 时均不通过。

## 2. 缺失时直接安装

用户已授权在启动预检发现缺失时直接安装 JDK 21。不要重复要求确认；先报告将使用的系统、包管理器和命令，再执行安装。安装前先探测平台和包管理器，只使用下表中的受信任包管理器：

| 平台 | 包管理器探测 | 安装命令 |
| --- | --- | --- |
| macOS | `command -v brew` | `brew install --cask temurin@21` |
| Debian/Ubuntu | `command -v apt-get` | `sudo apt-get update && sudo apt-get install -y openjdk-21-jdk` |
| Fedora/RHEL | `command -v dnf` | `sudo dnf install -y java-21-openjdk-devel` |
| Arch Linux | `command -v pacman` | `sudo pacman -S --noconfirm jdk21-openjdk` |
| Windows | `Get-Command winget` | `winget install --exact --id EclipseAdoptium.Temurin.21.JDK` |
| Windows 备用 | `Get-Command choco` | `choco install temurin21 -y` |

执行规则：

1. 优先选择当前平台检测到的第一方或系统认可包管理器；Windows 仅在 `winget` 不可用时使用已存在的 Chocolatey。
2. Linux 的安装命令需要管理员权限时，直接使用系统的 `sudo` 授权流程；不要尝试绕过权限控制。
3. 已有其他 JDK 时只并行安装 JDK 21，不卸载、覆盖或重置旧版本。
4. 不使用 `curl | sh`、`wget | sh`、未知下载地址、未经验证的安装脚本或要求提交凭据的安装器。
5. 包管理器不存在、权限不足或安装失败时，立即停止后续工作，输出可复现的人工安装命令和失败原因。

如果当前环境没有可用包管理器，不能为了安装 JDK 临时下载或执行未知安装器。应报告阻塞，并等待用户安装 JDK 21 或提供受信任的包管理器。

## 3. 安装后绑定当前项目进程

安装完成后，只修改当前 Skill 进程及其子进程的环境，不自动改写用户的 shell profile、系统注册表或全局 Java 默认值。

### macOS

```sh
export JAVA_HOME="$(/usr/libexec/java_home -v 21)"
export PATH="$JAVA_HOME/bin:$PATH"
```

### Linux

优先根据当前解析到的 `javac` 计算 JDK 根目录，然后绑定当前进程：

```sh
JAVAC_PATH="$(readlink -f "$(command -v javac)")"
export JAVA_HOME="$(dirname "$(dirname "$JAVAC_PATH")")"
export PATH="$JAVA_HOME/bin:$PATH"
```

如果发行版不支持 `readlink -f`，应使用该发行版的 JDK 路径查询能力；不能猜测路径，也不能把 JRE 目录当作 `JAVA_HOME`。

### Windows PowerShell

解析 JDK 21 安装目录后，仅对当前 PowerShell 进程设置：

```powershell
$env:JAVA_HOME = "<resolved-jdk-21-path>"
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
```

`<resolved-jdk-21-path>` 必须替换为实际存在且包含 `bin\java.exe` 与 `bin\javac.exe` 的目录，不能把示例占位符原样执行。

## 4. 安装后验证

重新执行第 1 节的检查，并额外确认命令来源与 `JAVA_HOME` 一致：

```sh
command -v java
command -v javac
java -version
javac -version
printf 'JAVA_HOME=%s\n' "$JAVA_HOME"
```

Windows 使用 `Get-Command java`、`Get-Command javac` 和 `$env:JAVA_HOME` 完成等价检查。只有 `java`、`javac`、`JAVA_HOME`、主版本 21 全部通过，才能继续执行 Maven、Spring Boot 初始化或 TDD。

## 5. 失败处理

以下任一情况必须停止，不得开始头脑风暴、创建工程、写代码或运行后端构建：

- `java` 或 `javac` 不存在。
- 主版本不是 21。
- `JAVA_HOME` 未设置、不可执行或与实际命令来源不一致。
- 包管理器缺失、安装权限不足或安装命令失败。
- 安装后仍无法确认完整 JDK 21。
- 当前平台不在已验证的安装路径内。

失败报告至少包含：平台、探测到的包管理器、执行的安装命令、`java`/`javac` 版本、`JAVA_HOME`、失败原因和下一步人工处理建议。输出中不得包含令牌、密码、私钥或完整敏感环境变量。

## 6. 完成证据

预检结束时使用以下结构记录证据：

```text
JDK preflight: PASS | FAIL
OS/package manager: <platform and manager>
java: <version and resolved path>
javac: <version and resolved path>
JAVA_HOME: <redacted or resolved path>
installation: <already present | installed | blocked>
next step: <continue | stop with manual action>
```
