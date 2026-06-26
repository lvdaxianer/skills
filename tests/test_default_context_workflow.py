"""
Contract tests for default agent context workflow rules.

Author: lvdaxianerplus
Date: 2026-06-09
"""

import unittest
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONTEXT_FILES = [
    PROJECT_ROOT / "AGENTS.md",
    PROJECT_ROOT / "CLAUDE.md",
]
HOME_POINTER_FILES = [
    Path.home() / ".claude" / "skills" / "AGENTS.md",
    Path.home() / ".claude" / "skills" / "CLAUDE.md",
    Path.home() / ".claude" / "CLAUDE.md",
    Path.home() / ".codex" / "AGENTS.md",
]
REQUIRED_WORKFLOW_MARKERS = [
    "development-workflow/SKILL.md",
    "plan-first",
    "TDD",
    "code-review-spec",
    "中文 Conventional Commit",
    "body 和 footer",
    "openspec/changes/<change-name>/",
    "openspec validate <change-name> --strict",
    "non-hidden `openspec/` directory",
    "initialize the OpenSpec scaffold",
    "Codex and Claude instruction targets",
    "Hidden `.openspec` paths do not satisfy",
    "Future persisted changes and approved specs must be based on the project OpenSpec workflow",
    "changes under `openspec/changes/`",
    "approved specs under `openspec/specs/`",
    "Non-OpenSpec documents do not replace",
    "final audit report",
]
REQUIRED_STRICT_REVIEW_MARKERS = [
    "严格执行 `code-review-spec`",
    "按 canonical 规范修复所有应修复的问题",
]
REQUIRED_SECTION_MARKERS = [
    "## Stage Boundaries",
    "## Lightweight Discussion And Architecture Design",
    "## OpenSpec Planning Requirements",
    "## Commit Message Requirements",
    "## Mandatory Task Loop",
    "## Gate Rules",
    "## Required Status Format",
]
LIGHTWEIGHT_DISCUSSION_MARKERS = [
    "需求讨论、方案比较、架构设计、调研总结、快速架构设计文档草稿",
    "不触发完整 `development-workflow`",
    "不要求 OpenSpec planning、TDD、code-review-spec 或 commit-per-task gates",
    "进入代码、测试、配置、重构、持久项目文档、OpenSpec change 或 git commit",
    "必须先切换回完整 `development-workflow`",
]
POINTER_ONLY_MARKERS = [
    "~/.claude/skills/development-workflow/SKILL.md",
]
HARD_TONE_MARKERS = [
    "The workflow is mandatory.",
    "Do not treat it as optional guidance.",
]
NO_DUPLICATED_WORKFLOW_MARKERS = [
    "brainstorming-first",
    "OpenSpec-plan-first",
    "TDD-first",
    "commit-per-task",
    "final-audit-and-archive",
]


class DefaultContextWorkflowTest(unittest.TestCase):
    """
    Verify default context files load the development workflow.

    Author: lvdaxianerplus
    Date: 2026-06-09
    """

    def test_default_context_files_exist(self):
        """
        Codex and Claude must both have root-level startup context files.

        Author: lvdaxianerplus
        Date: 2026-06-09
        """
        missing_files = [
            context_file.name
            for context_file in DEFAULT_CONTEXT_FILES
            if not context_file.exists()
        ]

        self.assertEqual([], missing_files)

    def test_default_context_references_development_workflow(self):
        """
        Startup context must require the development workflow skill.

        Author: lvdaxianerplus
        Date: 2026-06-09
        """
        for context_file in DEFAULT_CONTEXT_FILES:
            with self.subTest(context_file=context_file.name):
                self.assertTrue(context_file.exists())
                content = context_file.read_text(encoding="utf-8")

                for marker in REQUIRED_WORKFLOW_MARKERS:
                    self.assertIn(marker, content)

                for marker in REQUIRED_STRICT_REVIEW_MARKERS:
                    self.assertIn(marker, content)

                for marker in REQUIRED_SECTION_MARKERS:
                    self.assertIn(marker, content)

                for marker in HARD_TONE_MARKERS:
                    self.assertIn(marker, content)

    def test_default_context_allows_lightweight_design_discussion(self):
        """
        Requirement discussion and architecture drafts should stay lightweight.

        Author: lvdaxianer@yeah.net
        Date: 2026-06-26
        """
        for context_file in DEFAULT_CONTEXT_FILES:
            with self.subTest(context_file=context_file.name):
                content = context_file.read_text(encoding="utf-8")

                for marker in LIGHTWEIGHT_DISCUSSION_MARKERS:
                    self.assertIn(marker, content)

    def test_home_context_files_are_pointer_only(self):
        """
        Home context files must point to the canonical skill instead of duplicating it.

        Author: lvdaxianerplus
        Date: 2026-06-14
        """
        for context_file in HOME_POINTER_FILES:
            with self.subTest(context_file=str(context_file)):
                self.assertTrue(context_file.exists())
                content = context_file.read_text(encoding="utf-8")

                for marker in POINTER_ONLY_MARKERS:
                    self.assertIn(marker, content)

                for marker in HARD_TONE_MARKERS:
                    self.assertIn(marker, content)

                for marker in NO_DUPLICATED_WORKFLOW_MARKERS:
                    self.assertNotIn(marker, content)


if __name__ == "__main__":
    unittest.main()
