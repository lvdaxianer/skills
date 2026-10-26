# Spec Delta

## Purpose

让项目把稳定、可迁移的启动上下文保存在仓库内，并按目标 Agent 的约定安全地生成启动文件，使项目在 clone、换电脑或切换 Agent 后仍能快速恢复一致的工作上下文。

## ADDED Requirements

### Requirement: Project context has one repository source of truth

The system SHALL use `.project-context/` as the repository-tracked source of truth for project startup context and SHALL keep target Agent files as generated projections.

#### Scenario: Existing context is used during initialization

- **WHEN** initialization runs in a repository containing `.project-context/`
- **THEN** the system reads that directory as the authoritative input and does not treat existing target files as a competing source of truth

#### Scenario: Context source is absent

- **WHEN** initialization runs without `.project-context/`
- **THEN** the system reports that the source is absent and creates it only when initialization input is provided

### Requirement: Context can be initialized and synchronized across configured Agents

The system SHALL support initializing or synchronizing configured targets such as `.claude`, `.codex`, and `.kimi` from the repository context source.

#### Scenario: Clone is initialized on a new machine

- **WHEN** a user clones a repository containing `.project-context/` and runs initialization
- **THEN** the system recreates the configured Agent startup files using paths and content that are valid on the new machine

#### Scenario: Target configuration adds an Agent

- **WHEN** `targets.yaml` declares a new Agent directory and output file
- **THEN** synchronization creates or updates that configured target without changing unrelated targets

### Requirement: Synchronization is idempotent and preserves user content

The system SHALL update only its managed blocks in target files and SHALL preserve content outside those blocks.

#### Scenario: Synchronization is repeated

- **WHEN** synchronization runs twice without a source change
- **THEN** the second run produces no additional duplicate content and the target files remain equivalent

#### Scenario: Target contains manual content

- **WHEN** a target file contains user content outside the managed block
- **THEN** synchronization preserves that content while replacing only the managed block

### Requirement: Persisted context is portable

The system SHALL reject absolute filesystem paths and machine-specific path values in persisted context and target configuration.

#### Scenario: Absolute path is supplied

- **WHEN** a context entry or target path contains a POSIX, Windows, or home-directory absolute path
- **THEN** validation fails, identifies the offending value, and does not write the invalid content

#### Scenario: Relative project path is supplied

- **WHEN** a path is relative to the project root and does not escape it
- **THEN** validation accepts the path and preserves it in portable form

### Requirement: Sensitive and transient information is excluded

The system SHALL block likely secrets, credentials, personal machine data, and transient session details from being persisted as project context.

#### Scenario: Suspected secret is detected

- **WHEN** input contains a token, password, private key, cookie, or equivalent secret pattern
- **THEN** the system stops the write and reports the category of sensitive data that requires removal or confirmation

#### Scenario: Stable project fact is supplied

- **WHEN** input describes a confirmed project convention, command, module boundary, or architecture fact
- **THEN** the system can persist it in the appropriate context source file

### Requirement: Preview and verification report actionable results

The system SHALL provide preview and verification modes that report planned changes, invalid paths, malformed managed blocks, missing targets, and unresolved conflicts without silently overwriting files.

#### Scenario: Preview is requested

- **WHEN** the user runs preview mode
- **THEN** the system reports additions, updates, skips, and warnings without modifying source or target files

#### Scenario: Verification finds an invalid target

- **WHEN** verification finds a target outside the repository root or a malformed managed block
- **THEN** verification fails with the target path and a corrective explanation
