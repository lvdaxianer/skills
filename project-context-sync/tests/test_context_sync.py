import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SKILL_ROOT = Path(__file__).resolve().parents[1]
CLI = SKILL_ROOT / "scripts" / "context_sync.py"


class ContextSyncCliTests(unittest.TestCase):
    def test_init_creates_portable_source_and_configured_targets(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            result = subprocess.run(
                [sys.executable, str(CLI), "init", "--root", str(root)],
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertTrue((root / ".project-context" / "project.md").is_file())
            self.assertTrue((root / ".project-context" / "targets.json").is_file())
            targets = json.loads(
                (root / ".project-context" / "targets.json").read_text()
            )
            for target in targets["targets"]:
                self.assertTrue((root / target["file"]).is_file())
            self.assertNotIn(str(root), result.stdout)

    def test_sync_rejects_single_segment_posix_absolute_path(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            init_result = subprocess.run(
                [sys.executable, str(CLI), "init", "--root", str(root)],
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(init_result.returncode, 0, init_result.stderr)
            project_file = root / ".project-context" / "project.md"
            project_file.write_text("# Project\n\nRoot: /tmp\n", encoding="utf-8")

            result = subprocess.run(
                [sys.executable, str(CLI), "sync", "--root", str(root)],
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertNotEqual(result.returncode, 0)
            self.assertIn("absolute-path", result.stderr)

    def test_preview_reports_target_changes_without_writing(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            init_result = subprocess.run(
                [sys.executable, str(CLI), "init", "--root", str(root)],
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(init_result.returncode, 0, init_result.stderr)
            target = root / ".claude" / "CLAUDE.md"
            before = target.read_text(encoding="utf-8")
            project_file = root / ".project-context" / "project.md"
            project_file.write_text("# Project\n\nA confirmed project fact.\n", encoding="utf-8")

            result = subprocess.run(
                [sys.executable, str(CLI), "preview", "--root", str(root)],
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn(".claude/CLAUDE.md", result.stdout)
            self.assertEqual(before, target.read_text(encoding="utf-8"))

    def test_sync_preserves_unmanaged_content_and_is_idempotent(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            init_result = subprocess.run(
                [sys.executable, str(CLI), "init", "--root", str(root)],
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(init_result.returncode, 0, init_result.stderr)
            target = root / ".claude" / "CLAUDE.md"
            target.write_text("# Team Notes\n\nKeep this line.\n", encoding="utf-8")
            first = subprocess.run(
                [sys.executable, str(CLI), "sync", "--root", str(root)],
                capture_output=True,
                text=True,
                check=False,
            )
            first_content = target.read_text(encoding="utf-8")
            second = subprocess.run(
                [sys.executable, str(CLI), "sync", "--root", str(root)],
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertEqual(first.returncode, 0, first.stderr)
            self.assertEqual(second.returncode, 0, second.stderr)
            self.assertEqual(first_content, target.read_text(encoding="utf-8"))
            self.assertIn("Keep this line.", first_content)
            self.assertEqual(first_content.count("BEGIN PROJECT-CONTEXT:managed"), 1)

    def test_sync_rejects_secret_like_context(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            init_result = subprocess.run(
                [sys.executable, str(CLI), "init", "--root", str(root)],
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(init_result.returncode, 0, init_result.stderr)
            project_file = root / ".project-context" / "project.md"
            project_file.write_text("API_KEY=real-secret-value\n", encoding="utf-8")

            result = subprocess.run(
                [sys.executable, str(CLI), "sync", "--root", str(root)],
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertNotEqual(result.returncode, 0)
            self.assertIn("secret-like-value", result.stderr)
            self.assertNotIn("real-secret-value", result.stderr)

    def test_sync_rejects_target_path_traversal(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            init_result = subprocess.run(
                [sys.executable, str(CLI), "init", "--root", str(root)],
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(init_result.returncode, 0, init_result.stderr)
            config_file = root / ".project-context" / "targets.json"
            config = json.loads(config_file.read_text(encoding="utf-8"))
            config["targets"][0]["file"] = "../outside.md"
            config_file.write_text(json.dumps(config), encoding="utf-8")

            result = subprocess.run(
                [sys.executable, str(CLI), "sync", "--root", str(root)],
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertNotEqual(result.returncode, 0)
            self.assertIn("无效的目录片段", result.stderr)

    def test_verify_rejects_target_without_managed_block(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            init_result = subprocess.run(
                [sys.executable, str(CLI), "init", "--root", str(root)],
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(init_result.returncode, 0, init_result.stderr)
            target = root / ".claude" / "CLAUDE.md"
            target.write_text("# Manual only\n", encoding="utf-8")

            result = subprocess.run(
                [sys.executable, str(CLI), "verify", "--root", str(root)],
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertNotEqual(result.returncode, 0)
            self.assertIn("managed-block-missing", result.stderr)

    def test_sync_rejects_symlink_target_outside_project_root(self):
        with tempfile.TemporaryDirectory() as temp_dir, tempfile.TemporaryDirectory(
            dir=Path(temp_dir).parent
        ) as outside_dir:
            root = Path(temp_dir)
            init_result = subprocess.run(
                [sys.executable, str(CLI), "init", "--root", str(root)],
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(init_result.returncode, 0, init_result.stderr)
            outside = Path(outside_dir)
            os.symlink(outside, root / ".codex" / "linked")
            config_file = root / ".project-context" / "targets.json"
            config = json.loads(config_file.read_text(encoding="utf-8"))
            config["targets"][1]["file"] = ".codex/linked/AGENTS.md"
            config_file.write_text(json.dumps(config), encoding="utf-8")

            result = subprocess.run(
                [sys.executable, str(CLI), "sync", "--root", str(root)],
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertNotEqual(result.returncode, 0)
            self.assertIn("逃逸项目根目录", result.stderr)

    def test_sync_rejects_context_symlink_outside_project_root(self):
        with tempfile.TemporaryDirectory() as temp_dir, tempfile.TemporaryDirectory(
            dir=Path(temp_dir).parent
        ) as outside_dir:
            root = Path(temp_dir)
            init_result = subprocess.run(
                [sys.executable, str(CLI), "init", "--root", str(root)],
                capture_output=True,
                text=True,
                check=False,
            )
            self.assertEqual(init_result.returncode, 0, init_result.stderr)
            outside_file = Path(outside_dir) / "project.md"
            outside_file.write_text("# External\n", encoding="utf-8")
            project_file = root / ".project-context" / "project.md"
            project_file.unlink()
            os.symlink(outside_file, project_file)

            result = subprocess.run(
                [sys.executable, str(CLI), "sync", "--root", str(root)],
                capture_output=True,
                text=True,
                check=False,
            )

            self.assertNotEqual(result.returncode, 0)
            self.assertIn("不在项目根目录内", result.stderr)


if __name__ == "__main__":
    unittest.main()
