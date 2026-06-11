---
name: commit
description: Use when the user asks to commit changes, generate a Conventional Commit message, run `/commit`, write a Chinese git commit message, split commits, or decide whether `--no-verify`, `--style`, or `--type` should be used.
---

# Commit

This Codex skill is a thin pointer to the single maintained commit standard.

## Canonical Source

Read and follow this file before creating or describing any commit:

`/Users/lvdaxianer/.claude/commands/commit.md`

## Required Behavior

- Treat `/Users/lvdaxianer/.claude/commands/commit.md` as the source of truth.
- Do not rely on duplicated commit rules in this file.
- If repository-local instructions conflict with the canonical source, follow the stricter rule and explain the conflict briefly.
- If the canonical source cannot be read, stop and report that commit rules are unavailable.
