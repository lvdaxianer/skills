"""
Contract tests for package-backup documentation and default context files.

Author: lvdaxianer@yeah.net
Date: 2026-06-25
"""

import unittest
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
README_FILE = PROJECT_ROOT / "README.md"
README_ZH_FILE = PROJECT_ROOT / "README-zh.md"
CLAUDE_FILE = PROJECT_ROOT / "CLAUDE.md"
AGENTS_FILE = PROJECT_ROOT / "AGENTS.md"


def read_required_text(path: Path) -> str:
    """
    Read a required repository document with a clear failure message.

    Author: lvdaxianer@yeah.net
    Date: 2026-06-25
    """
    if not path.is_file():
        raise AssertionError(f"Required repository document is missing: {path}")
    return path.read_text(encoding="utf-8")


class PackageBackupDocumentationTest(unittest.TestCase):
    """
    Verify README and context documents advertise package-backup correctly.

    Author: lvdaxianer@yeah.net
    Date: 2026-06-25
    """

    def test_readme_mentions_package_backup_installation(self):
        """
        The English README must advertise package-backup installation.

        Author: lvdaxianer@yeah.net
        Date: 2026-06-25
        """
        content = read_required_text(README_FILE)

        self.assertIn("package-backup", content)
        self.assertIn("~/.claude/skills/package-backup", content)
        self.assertIn(".claude/skills/package-backup", content)

    def test_readme_zh_mentions_package_backup_installation(self):
        """
        The Chinese README must advertise package-backup installation.

        Author: lvdaxianer@yeah.net
        Date: 2026-06-25
        """
        content = read_required_text(README_ZH_FILE)

        self.assertIn("package-backup", content)
        self.assertIn("~/.claude/skills/package-backup", content)
        self.assertIn(".claude/skills/package-backup", content)

    def test_context_files_point_to_package_backup_for_archive_work(self):
        """
        CLAUDE.md and AGENTS.md must mention package-backup for archive work.

        Author: lvdaxianer@yeah.net
        Date: 2026-06-25
        """
        claude_content = read_required_text(CLAUDE_FILE)
        agents_content = read_required_text(AGENTS_FILE)

        self.assertIn("package-backup/SKILL.md", claude_content)
        self.assertIn("package-backup/SKILL.md", agents_content)
        self.assertIn("development-workflow/SKILL.md", claude_content)
        self.assertIn("development-workflow/SKILL.md", agents_content)


if __name__ == "__main__":
    unittest.main()
