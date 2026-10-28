# Design: exact Skill source mapping

The README will present a source-of-truth table before installation commands. First-party standards are fetched from `https://gitee.com/lvdaxianer/skills.git`; workflow skills supplied by Superpowers are fetched from `https://github.com/cline/superpowers.git`. The AI must clone or reuse a verified local checkout, resolve each required Skill path, and stop if a path is absent or a source cannot be verified.

The README will not treat OpenSpec or worktree helpers as runtime dependencies of `design-to-development`, because the Skill explicitly uses development-workflow only as a process reference. Those suites are installed only when the user separately requests the full repository workflow.
