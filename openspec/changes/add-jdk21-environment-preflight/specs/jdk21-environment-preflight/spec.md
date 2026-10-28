# Spec Delta

## Purpose

在开始需求讨论和工程实现前，确保固定 Java 后端架构拥有可用的 JDK 21，并在缺失时通过受信任的本机包管理器自动恢复或明确停止。

## ADDED Requirements

### Requirement: Check JDK 21 before project work

The Skill MUST check for an executable JDK 21 before starting project generation, implementation, or build verification.

#### Scenario: JDK 21 is available
- **WHEN** `java` and `javac` resolve to major version 21 and `JAVA_HOME` identifies that installation
- **THEN** the Skill MUST record the preflight as passed and continue to the next workflow stage

#### Scenario: Only another Java version is available
- **WHEN** `java` or `javac` resolves to a major version other than 21
- **THEN** the Skill MUST treat the preflight as failed and MUST attempt to install JDK 21 without uninstalling the existing version

### Requirement: Install missing JDK 21 safely

The Skill MUST use a detected operating system and an available trusted package manager to install JDK 21 when the preflight fails.

#### Scenario: Supported package manager is available
- **WHEN** the operating system and package manager are recognized
- **THEN** the Skill MUST run the platform-specific JDK 21 installation command, preserve existing JDK installations, and continue only after post-install verification passes

#### Scenario: No supported installation path is available
- **WHEN** no recognized package manager exists or required permissions are unavailable
- **THEN** the Skill MUST stop before project work and report the exact missing capability and a safe next command or manual installation path

### Requirement: Verify the active Java environment

The Skill MUST verify `java`, `javac`, `JAVA_HOME`, and the active major version after an existing or newly installed JDK is selected.

#### Scenario: Post-install verification succeeds
- **WHEN** the selected `JAVA_HOME` contains a JDK and both executables report major version 21
- **THEN** the Skill MUST make that environment available to the current project context and continue

#### Scenario: Post-install verification fails
- **WHEN** an executable is missing, `JAVA_HOME` is invalid, or the active major version is not 21
- **THEN** the Skill MUST stop and report verification evidence without claiming the project is ready

### Requirement: Keep installation scope safe

The Skill MUST avoid destructive Java changes and MUST NOT execute arbitrary remote installation scripts.

#### Scenario: Existing JDK installations are present
- **WHEN** one or more non-21 JDKs already exist
- **THEN** the Skill MUST leave them installed and select JDK 21 for the current project context

#### Scenario: Installation command is not trusted
- **WHEN** a proposed installation requires piping unknown network content to a shell or executing an unverified installer
- **THEN** the Skill MUST reject that path and stop with a safe alternative
