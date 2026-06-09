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
REQUIRED_WORKFLOW_MARKERS = [
    "development-workflow/SKILL.md",
    "plan-first",
    "TDD",
    "code-review-spec",
    "中文 Conventional Commit",
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


if __name__ == "__main__":
    unittest.main()
