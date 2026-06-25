"""
Contract tests for the local package-backup skill installation.

Author: lvdaxianer@yeah.net
Date: 2026-06-25
"""

import unittest
from pathlib import Path


INSTALLED_SKILL_DIR = Path("/Users/lvdaxianer/.claude/skills/package-backup")


class PackageBackupInstallationTest(unittest.TestCase):
    """
    Verify the package-backup skill is installed for Claude discovery.

    Author: lvdaxianer@yeah.net
    Date: 2026-06-25
    """

    def test_package_backup_skill_directory_exists(self):
        """
        The local Claude skills directory must contain package-backup.

        Author: lvdaxianer@yeah.net
        Date: 2026-06-25
        """
        self.assertTrue(INSTALLED_SKILL_DIR.is_dir(), INSTALLED_SKILL_DIR)


if __name__ == "__main__":
    unittest.main()
