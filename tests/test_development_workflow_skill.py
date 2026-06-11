"""
Contract tests for the mandatory development workflow skill.

Author: lvdaxianerplus
Date: 2026-06-09
"""

import unittest
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SKILL_FILE = PROJECT_ROOT / "development-workflow" / "SKILL.md"
MANDATORY_LOOP_MARKERS = [
    "superpowers:brainstorming",
    "OpenSpec",
    "OpenSpec plan",
    "Commit the OpenSpec plan",
    "TDD",
    "RED",
    "GREEN",
    "plan-implementation consistency audit",
    "code-review-spec",
    "one atomic Chinese Conventional Commit",
    "next task",
]
OPENSPEC_STRUCTURE_MARKERS = [
    "openspec/changes/<change-name>/",
    ".openspec.yaml",
    "proposal.md",
    "design.md",
    "tasks.md",
    "specs/<capability>/spec.md",
    "openspec validate <change-name> --strict",
]
POINTER_SOURCE_MARKERS = [
    "/Users/lvdaxianer/.agents/skills/code-review-spec/SKILL.md",
    "/Users/lvdaxianer/.codex/skills/commit/SKILL.md",
    "/Users/lvdaxianer/.claude/skills/code-review-spec/SKILL.md",
    "/Users/lvdaxianer/.claude/skills/code-review-spec/spec.md",
    "/Users/lvdaxianer/.claude/skills/code-review-spec/references/*",
    "/Users/lvdaxianer/.claude/commands/commit.md",
]
STRICT_REVIEW_MARKERS = [
    "必须严格执行 `code-review-spec`",
    "必须逐项对照 canonical 的 `SKILL.md`、`spec.md` 以及相关 `references/*` 检查",
    "任何 `code-review-spec` 结论都必须基于实际对照结果",
    "a gate only passes after every applicable rule has been checked",
]
COMPLETION_AUDIT_MARKERS = [
    "Mark exactly one completed task immediately after its gate passes",
    "Do not batch-complete tasks at the end",
    "final audit",
    "all planned tasks are complete",
    "archive the completed OpenSpec change",
]
AUDIT_REPORT_MARKERS = [
    "final audit report",
    "lists completed tasks",
    "lists unfinished tasks",
]


class DevelopmentWorkflowSkillTest(unittest.TestCase):
    """
    Verify that the development workflow skill preserves required gates.

    Author: lvdaxianerplus
    Date: 2026-06-09
    """

    def test_skill_declares_required_metadata(self):
        """
        The skill must expose a discoverable name and trigger description.

        Author: lvdaxianerplus
        Date: 2026-06-09
        """
        content = SKILL_FILE.read_text(encoding="utf-8")

        self.assertIn("name: development-workflow", content)
        self.assertIn("description:", content)
        self.assertIn("Use when starting or executing development tasks", content)

    def test_skill_enforces_plan_tdd_review_commit_order(self):
        """
        The workflow must require plan, TDD, review, and commit in order.

        Author: lvdaxianerplus
        Date: 2026-06-09
        """
        content = SKILL_FILE.read_text(encoding="utf-8")
        self.assertIn("## Mandatory Task Loop", content)
        mandatory_loop = content.split("## Mandatory Task Loop", maxsplit=1)[1]

        marker_positions = [
            mandatory_loop.index(marker)
            for marker in MANDATORY_LOOP_MARKERS
        ]

        self.assertEqual(marker_positions, sorted(marker_positions))

    def test_skill_references_canonical_review_and_commit_sources(self):
        """
        The skill must route through pointer skills and canonical rule sources.

        Author: lvdaxianerplus
        Date: 2026-06-09
        """
        content = SKILL_FILE.read_text(encoding="utf-8")

        for marker in POINTER_SOURCE_MARKERS:
            self.assertIn(marker, content)

    def test_skill_defines_openspec_change_structure(self):
        """
        The workflow must use the local OpenSpec change layout explicitly.

        Author: lvdaxianerplus
        Date: 2026-06-11
        """
        content = SKILL_FILE.read_text(encoding="utf-8")

        for marker in OPENSPEC_STRUCTURE_MARKERS:
            self.assertIn(marker, content)

    def test_skill_disallows_questions_and_skipping_gates(self):
        """
        The skill must make autonomous fixes and block skipped validation gates.

        Author: lvdaxianerplus
        Date: 2026-06-09
        """
        content = SKILL_FILE.read_text(encoding="utf-8")

        self.assertIn("Do not ask for confirmation", content)
        self.assertIn("Do not skip validation", content)
        self.assertIn("If a gate fails", content)

    def test_skill_requires_strict_code_review_spec_execution(self):
        """
        The workflow must explicitly require strict canonical code-review-spec checks.

        Author: lvdaxianerplus
        Date: 2026-06-10
        """
        content = SKILL_FILE.read_text(encoding="utf-8")

        for marker in STRICT_REVIEW_MARKERS:
            self.assertIn(marker, content)

    def test_skill_requires_incremental_completion_and_final_audit(self):
        """
        The workflow must keep durable progress and close finished OpenSpec changes.

        Author: lvdaxianerplus
        Date: 2026-06-11
        """
        content = SKILL_FILE.read_text(encoding="utf-8")

        for marker in COMPLETION_AUDIT_MARKERS:
            self.assertIn(marker, content)

    def test_skill_requires_final_audit_report(self):
        """
        The workflow must emit a final audit report when all tasks finish.

        Author: lvdaxianerplus
        Date: 2026-06-11
        """
        content = SKILL_FILE.read_text(encoding="utf-8")

        for marker in AUDIT_REPORT_MARKERS:
            self.assertIn(marker, content)


if __name__ == "__main__":
    unittest.main()
