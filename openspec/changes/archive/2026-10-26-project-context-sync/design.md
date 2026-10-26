# Design

## Context

See `proposal.md` and `specs/project-context-sync/spec.md` for the motivation and observable behavior. The repository is a Markdown-based skill collection, so the new skill must be independently installable and must not require a project-specific runtime.

The design must preserve user-authored Agent configuration, remain usable after cloning to another machine, and make invalid paths or sensitive values fail before they are persisted.

## Goals / Non-Goals

**Goals:**

- Provide a human-editable `.project-context/` source with a small, explicit target registry.
- Support scaffold/init, sync, preview, and verify workflows from one standard-library utility.
- Render one managed block per configured target while preserving all unmanaged content.
- Validate relative paths, repository containment, secret-like values, and malformed managed blocks before writes.
- Keep the skill instructions concise and make the utility independently testable.

**Non-Goals:**

- Automatically infer the entire project architecture or scan every repository file.
- Replace an Agent's native configuration format or claim that every Agent uses the same filename.
- Store chat transcripts, credentials, local machine settings, or transient task state.
- Manage global user-level skill installation or modify files outside the selected repository root.

## Decisions

### Repository source layout

Use a tracked `.project-context/` directory containing Markdown source files and `targets.json`:

```text
.project-context/
├── project.md
├── conventions.md
├── commands.md
├── architecture.md
└── targets.json
```

The utility reads Markdown files in lexical order, excluding `README.md` and `targets.json`, so teams can add focused files without changing the tool. A scaffold creates the four starter files and a target registry with configurable defaults.

`targets.json` is chosen over YAML because the utility uses only Python's standard library. Every target declares a repository-relative output file and may include a display name. The registry is data, not executable configuration.

### Target projection

Each output file receives a generated header and exactly one managed block:

```markdown
<!-- BEGIN PROJECT-CONTEXT:managed -->
...
<!-- END PROJECT-CONTEXT:managed -->
```

The source content is normalized to LF and joined under a generated title. If a target is absent, its parent directory and file are created. If the target has no managed block, the block is appended. If it has more than one block or only one marker, the operation fails without writing. Content outside the block is preserved byte-for-byte.

### Safe path and content validation

All persisted target paths are parsed as project-relative paths. Absolute POSIX paths, drive-letter paths, UNC paths, home-directory paths, `..` traversal, and symlink escapes are rejected. The process may resolve an internal absolute root for filesystem access, but it never serializes that root.

Source and target content are scanned before writes. The scanner rejects private-key headers, common credential prefixes, and assignments that look like real passwords, tokens, API keys, or cookies; obvious placeholders are allowed. Validation reports a relative file path and category, never echoing the suspected secret value.

### Operation modes

The utility exposes four modes:

- `init`: scaffold the source directory and default registry if absent, then synchronize configured targets.
- `sync`: validate the existing source and update all configured target blocks.
- `preview`: compute the same changes and report them without writing.
- `verify`: validate source, registry, target containment, and managed blocks without writing.

Natural-language capture remains an Agent responsibility described by `SKILL.md`: the Agent converts user-confirmed facts into the appropriate Markdown file, then invokes `verify`/`sync`. The utility does not pretend to understand arbitrary chat text.

### Verification and test strategy

Use Python `unittest` with temporary repositories to cover scaffolding, idempotent sync, preservation of unmanaged content, preview non-mutation, missing/malformed markers, absolute-path rejection, traversal/symlink rejection, and secret detection. Run the skill's test suite and CLI smoke checks from the repository root.

## Risks / Trade-offs

- [False-positive secret detection] → Allow explicit placeholders and report only the category; keep the scanner conservative and test representative Markdown.
- [Agent filename conventions differ] → Keep output files fully configurable in `targets.json`; defaults are examples, not hard-coded assumptions in the sync algorithm.
- [Manual edits inside the managed block are lost] → Document the block as generated and require durable facts to be edited in `.project-context/`.
- [A source Markdown file contains a legitimate absolute reference] → Fail closed and ask the user to replace it with a relative path or portable placeholder.

## Migration Plan

No existing project data is migrated automatically. A user runs `init` to create `.project-context/`, reviews the generated registry and starter files, adds confirmed facts, then runs `preview`, `verify`, and `sync`. Existing target files are preserved outside their managed blocks. Rollback is deleting only generated managed blocks or reverting the committed `.project-context/` and skill changes; the utility never deletes unmanaged files.

## Open Questions

None. Target filenames remain configurable, so adding future Agent conventions does not require changing the source format.
