"""
Contract tests for the mandatory development workflow skill.

Author: lvdaxianerplus
Date: 2026-06-09
"""

import unittest
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SKILL_FILE = PROJECT_ROOT / "development-workflow" / "SKILL.md"


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
        required_markers = [
            "superpowers:writing-plans",
            "TDD",
            "RED",
            "GREEN",
            "code-review-spec",
            "commit",
            "next task",
        ]

        marker_positions = [mandatory_loop.index(marker) for marker in required_markers]

        self.assertEqual(marker_positions, sorted(marker_positions))

    def test_skill_references_canonical_review_and_commit_sources(self):
        """
        The skill must point agents at the canonical review and commit rules.

        Author: lvdaxianerplus
        Date: 2026-06-09
        """
        content = SKILL_FILE.read_text(encoding="utf-8")

        self.assertIn("/Users/lvdaxianer/.claude/skills/code-review-spec/SKILL.md", content)
        self.assertIn("/Users/lvdaxianer/.claude/skills/commit/SKILL.md", content)
        self.assertIn("/Users/lvdaxianer/.claude/skills/code-review-spec", content)
        self.assertIn("/Users/lvdaxianer/.claude/commands/commit.md", content)
        self.assertNotIn("/Users/lvdaxianer/.agents/skills/code-review-spec/SKILL.md", content)
        self.assertNotIn("/Users/lvdaxianer/.codex/skills/commit/SKILL.md", content)

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

        required_markers = [
            "必须严格执行 `code-review-spec`",
            "必须逐项对照 canonical 的 `SKILL.md`、`spec.md` 以及相关 `references/*` 检查",
            "任何 `code-review-spec` 结论都必须基于实际对照结果",
            "a gate only passes after every applicable rule has been checked",
        ]

        for marker in required_markers:
            self.assertIn(marker, content)


if __name__ == "__main__":
    unittest.main()
