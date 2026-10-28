# skill-download-sources Specification

## Purpose
为 `design-to-development` 的安装流程提供可核验的 Skill 下载源和源码路径，确保 AI 能从第一方仓库或受信任的 Superpowers 源获取依赖，而不是猜测地址或执行未知安装器。

## Requirements

### Requirement: Declare authoritative download sources

The installation README MUST declare an authoritative repository or platform source for the main Skill and every dependency family.

#### Scenario: AI installs from a clean checkout

- **WHEN** the AI reads the README without any dependency already installed
- **THEN** it MUST know which repository to clone, which Skill path to resolve, and how to verify the source before copying files

### Requirement: Reject unverifiable sources

The installation README MUST require the AI to stop when an exact Skill path or source cannot be verified, rather than guessing a URL or using an unknown installer.

#### Scenario: A declared path is absent

- **WHEN** a cloned or configured source does not contain the requested `SKILL.md`
- **THEN** the AI MUST report the missing path and stop that installation, unless a configured trusted mirror provides the same exact Skill
