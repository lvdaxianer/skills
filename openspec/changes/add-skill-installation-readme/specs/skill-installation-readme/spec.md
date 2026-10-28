# Skill installation README Specification

## ADDED Requirements

### Requirement: Provide an AI-executable installation protocol

The repository MUST provide a README for `design-to-development` that an AI can follow to install the main Skill and all declared dependencies.

#### Scenario: Local repository installation

- **WHEN** an AI reads the README from a checked-out repository
- **THEN** it MUST be able to identify the source root, target Skill directory, installation mode, dependency list, and verification steps

### Requirement: Declare dependency tiers and platform mapping

The README MUST distinguish mandatory dependencies from conditional extensions and MUST explain the mapping between `superpowers:brainstorming` and the platform's available brainstorming Skill.

#### Scenario: A dependency is missing locally

- **WHEN** a declared dependency is not in the repository or installed target directory
- **THEN** the AI MUST use the configured Skill registry or installer with the exact Skill name, or stop with the missing dependency clearly reported; it MUST NOT invent a download URL or run an untrusted installer

### Requirement: Verify installation and protect existing skills

The README MUST define idempotent installation behavior, conflict handling, and post-install verification for the main Skill, dependencies, references, and frontmatter.

#### Scenario: Installation completes

- **WHEN** all requested Skill directories are installed
- **THEN** the AI MUST report target directories, installed names, skipped existing names, unresolved names, and the exact verification result
