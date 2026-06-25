---
name: package-backup
description: Use when the user asks to package, back up, zip, restore, unzip, extract, or otherwise handle packaging and extraction with the package_backup.sh contract.
---

# Package Backup

This skill is a thin pointer to the repository's archive contract.

## Canonical Source

Read and follow this reference before performing any package or restore action:

`package-backup/references/package_backup.md`

The reference is the local source of truth for behavior derived from
`/Users/lvdaxianer/Downloads/shell-main/package_backup.sh`.

## Required Behavior

- Treat the reference as mandatory before choosing archive names or running commands.
- Follow the script contract for backup naming, restore validation, and path safety.
- Do not invent alternate archive rules when this skill is triggered.
- If the reference cannot be read, stop and report that archive rules are unavailable.
