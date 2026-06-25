"""
Contract tests for the package-backup skill.

Author: lvdaxianer@yeah.net
Date: 2026-06-25
"""

import unittest
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SKILL_FILE = PROJECT_ROOT / "package-backup" / "SKILL.md"
REFERENCE_FILE = PROJECT_ROOT / "package-backup" / "references" / "package_backup.md"


def read_required_text(path: Path) -> str:
    """
    Read a required skill asset with a clear contract-test failure message.

    Author: lvdaxianer@yeah.net
    Date: 2026-06-25
    """
    if not path.is_file():
        raise AssertionError(f"Required skill asset is missing: {path}")
    return path.read_text(encoding="utf-8")


class PackageBackupSkillTest(unittest.TestCase):
    """
    Verify that archive and restore tasks follow package_backup.sh rules.

    Author: lvdaxianer@yeah.net
    Date: 2026-06-25
    """

    def test_skill_declares_archive_and_restore_triggers(self):
        """
        The skill must be discoverable for packaging and extraction work.

        Author: lvdaxianer@yeah.net
        Date: 2026-06-25
        """
        content = read_required_text(SKILL_FILE)

        self.assertIn("name: package-backup", content)
        self.assertIn("packaging", content)
        self.assertIn("extraction", content)
        self.assertIn("restore", content)
        self.assertIn("zip", content)

    def test_skill_requires_loading_package_backup_reference(self):
        """
        The skill must load the script-derived reference before acting.

        Author: lvdaxianer@yeah.net
        Date: 2026-06-25
        """
        content = read_required_text(SKILL_FILE)

        self.assertIn("references/package_backup.md", content)
        self.assertIn("before", content)
        self.assertIn("package_backup.sh", content)
        self.assertIn("source of truth", content)

    def test_reference_preserves_archive_naming_contract(self):
        """
        The reference must preserve archive naming and type validation rules.

        Author: lvdaxianer@yeah.net
        Date: 2026-06-25
        """
        content = read_required_text(REFERENCE_FILE)

        self.assertIn("[name].[type].[yyyyMMdd][sequence].zip", content)
        self.assertIn("backup", content)
        self.assertIn("pre-restore", content)
        self.assertIn("two-digit", content)
        self.assertIn("must not contain `/` or `.`", content)
        self.assertIn("next unused", content)

    def test_reference_preserves_restore_safety_contract(self):
        """
        The reference must preserve restore validation and snapshot behavior.

        Author: lvdaxianer@yeah.net
        Date: 2026-06-25
        """
        content = read_required_text(REFERENCE_FILE)

        self.assertIn("existing `.zip` file", content)
        self.assertIn("exactly one top-level", content)
        self.assertIn("absolute paths", content)
        self.assertIn("parent-directory traversal", content)
        self.assertIn("filename source name must match", content)
        self.assertIn("snapshot", content)
        self.assertIn("remove the existing target only after", content)


if __name__ == "__main__":
    unittest.main()
