"""
Contract tests for the commit skill pointer.

Author: lvdaxianerplus
Date: 2026-06-11
"""

import unittest
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SKILL_FILE = PROJECT_ROOT / "commit" / "SKILL.md"
CANONICAL_COMMIT_SOURCE = "/Users/lvdaxianer/.claude/commands/commit.md"
CANONICAL_COMMIT_FILE = Path(CANONICAL_COMMIT_SOURCE)


class CommitSkillTest(unittest.TestCase):
    """
    Verify that the commit skill delegates to the canonical commit rules.

    Author: lvdaxianerplus
    Date: 2026-06-11
    """

    def test_skill_declares_required_metadata(self):
        """
        The skill must expose discoverable metadata for commit-related requests.

        Author: lvdaxianerplus
        Date: 2026-06-11
        """
        content = SKILL_FILE.read_text(encoding="utf-8")

        self.assertIn("name: commit", content)
        self.assertIn("description:", content)
        self.assertIn("Conventional Commit", content)

    def test_skill_points_to_canonical_commit_standard(self):
        """
        The skill must use the maintained commit command as the source of truth.

        Author: lvdaxianerplus
        Date: 2026-06-11
        """
        content = SKILL_FILE.read_text(encoding="utf-8")

        self.assertIn(CANONICAL_COMMIT_SOURCE, content)
        self.assertIn("source of truth", content)
        self.assertIn("If the canonical source cannot be read", content)

    def test_canonical_commit_standard_requires_full_messages_by_default(self):
        """
        The canonical command must make body/footer the default commit contract.

        Author: lvdaxianerplus
        Date: 2026-06-14
        """
        content = CANONICAL_COMMIT_FILE.read_text(encoding="utf-8")

        self.assertIn("`full` (default)", content)
        self.assertIn("Every commit message MUST include a non-empty body", content)
        self.assertIn("Every commit message MUST include a non-empty footer", content)
        self.assertIn("Use `Refs:` when no breaking change or issue applies", content)


if __name__ == "__main__":
    unittest.main()
