#!/usr/bin/env python3
"""同步仓库内可移植的项目启动上下文。"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path, PurePath, PureWindowsPath


CONTEXT_DIR = ".project-context"
BEGIN_MARKER = "<!-- BEGIN PROJECT-CONTEXT:managed -->"
END_MARKER = "<!-- END PROJECT-CONTEXT:managed -->"
STARTER_FILES = (
    "project.md",
    "conventions.md",
    "commands.md",
    "architecture.md",
)
DEFAULT_TARGETS = (
    {"name": "claude", "file": ".claude/CLAUDE.md"},
    {"name": "codex", "file": ".codex/AGENTS.md"},
    {"name": "kimi", "file": ".kimi/AGENTS.md"},
)
PLACEHOLDER_VALUES = ("change_me", "changeme", "example", "placeholder", "<")
ABSOLUTE_PATH_RE = re.compile(
    r"(?:^|[\s\"'`()=])/(?!/)[A-Za-z0-9_.-]+(?:/[A-Za-z0-9_.-]+)*"
)
WINDOWS_PATH_RE = re.compile(r"(?:^|[\s\"'`()=])[A-Za-z]:[\\/][^\s\"'`()]+")
HOME_PATH_RE = re.compile(r"(?:^|[\s\"'`()=])~(?:/|\\)")
SECRET_RE = re.compile(
    r"(?i)(?:password|passwd|secret|token|api[_-]?key|access[_-]?key|cookie)"
    r"\s*[:=]\s*([^\s#]+)"
)
PRIVATE_KEY_RE = re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----")


class ContextError(Exception):
    """
    表示项目上下文无法安全处理。

    Author: lvdaxianer@yeah.net
    Date: 2026-10-26
    """


def display_path(path: Path, root: Path) -> str:
    """将内部路径转换为项目根目录相对路径。Args: path、root。Returns: POSIX 相对路径。Author: lvdaxianer@yeah.net。Date: 2026-10-26。"""
    return path.relative_to(root).as_posix()


def is_absolute_value(value: str) -> bool:
    """判断输入是否为 POSIX、Windows 或 home 绝对路径。Args: value。Returns: 是否为绝对路径。Author: lvdaxianer@yeah.net。Date: 2026-10-26。"""
    windows_path = PureWindowsPath(value)
    return Path(value).is_absolute() or windows_path.is_absolute() or value.startswith("~")


def reject_absolute_path(value: str, label: str) -> PurePath:
    """校验路径；Args: value、label；Returns: 相对路径；Raises: ContextError；Author: lvdaxianer@yeah.net；Date: 2026-10-26。"""
    # 先拒绝机器相关路径，避免把本机信息写进仓库。
    if is_absolute_value(value):
        raise ContextError(f"{label} 必须是相对项目根目录的路径")
    parts = PurePath(value).parts
    # 再拒绝当前目录和父目录片段，防止路径穿越。
    if not parts or any(part in ("", ".", "..") for part in parts):
        raise ContextError(f"{label} 含有无效的目录片段")
    return PurePath(*parts)


def resolve_target(root: Path, value: str, label: str) -> Path:
    """解析并确认目标路径不会逃逸项目根目录。Args: root、value、label。Returns: 目标路径。Raises: ContextError。Author: lvdaxianer@yeah.net。Date: 2026-10-26。"""
    relative = reject_absolute_path(value, label)
    target = root.joinpath(*relative.parts)
    resolved_root = root.resolve()
    resolved_parent = target.parent.resolve()
    # 父目录可能是符号链接，因此检查其真实位置。
    if not resolved_parent.is_relative_to(resolved_root):
        raise ContextError(f"{label} 不得逃逸项目根目录")
    # 已存在的目标文件也必须留在仓库内。
    if target.exists() and not target.resolve().is_relative_to(resolved_root):
        raise ContextError(f"{label} 的符号链接目标不在项目根目录内")
    return target


def inspect_text(text: str, label: str) -> list[str]:
    """检查文本中的绝对路径和疑似敏感信息。Args: text、label。Returns: 问题类别列表。Author: lvdaxianer@yeah.net。Date: 2026-10-26。"""
    issues = []
    # 路径和私钥问题只记录类别，不回显原文。
    if ABSOLUTE_PATH_RE.search(text) or WINDOWS_PATH_RE.search(text) or HOME_PATH_RE.search(text):
        issues.append(f"{label}: absolute-path")
    if PRIVATE_KEY_RE.search(text):
        issues.append(f"{label}: private-key")
    for match in SECRET_RE.finditer(text):
        value = match.group(1).lower().strip("\"'")
        # 明确的占位符不会被当作真实凭据。
        if not any(item in value for item in PLACEHOLDER_VALUES):
            issues.append(f"{label}: secret-like-value")
            break
    return issues


def validate_text(text: str, label: str) -> None:
    """拒绝不可移植或疑似敏感的持久化内容。Args: text、label。Raises: ContextError。Author: lvdaxianer@yeah.net。Date: 2026-10-26。"""
    issues = inspect_text(text, label)
    if issues:
        raise ContextError("; ".join(issues))


def read_json(path: Path, root: Path) -> dict:
    """读取 JSON 配置并转换解析错误。Args: path、root。Returns: JSON 对象。Raises: ContextError。Author: lvdaxianer@yeah.net。Date: 2026-10-26。"""
    try:
        content = path.read_text(encoding="utf-8")
        validate_text(content, display_path(path, root))
        value = json.loads(content)
    except (OSError, json.JSONDecodeError) as error:
        raise ContextError(f"{display_path(path, root)} 无法读取: {error}") from error
    if not isinstance(value, dict):
        raise ContextError(f"{display_path(path, root)} 必须是 JSON 对象")
    return value


def load_targets(root: Path, config_path: Path) -> list[dict]:
    """加载并校验 Agent 相对目标文件。Args: root、config_path。Returns: 目标列表。Raises: ContextError。Author: lvdaxianer@yeah.net。Date: 2026-10-26。"""
    config = read_json(config_path, root)
    targets = config.get("targets")
    if not isinstance(targets, list) or not targets:
        raise ContextError("targets.json 必须包含非空 targets 数组")
    checked = []
    for index, target in enumerate(targets):
        if not isinstance(target, dict) or not isinstance(target.get("file"), str):
            raise ContextError(f"targets[{index}] 必须包含 file 字段")
        file_value = target["file"]
        resolve_target(root, file_value, f"targets[{index}].file")
        checked.append({"name": target.get("name", f"target-{index + 1}"), "file": file_value})
    return checked


def starter_content(name: str) -> str:
    """生成不含机器信息的 starter Markdown。Args: name。Returns: starter 内容。Author: lvdaxianer@yeah.net。Date: 2026-10-26。"""
    return "\n".join(
        [
            f"# {name}",
            "",
            "<!-- 在这里记录稳定、可迁移、已确认的项目事实。 -->",
            "<!-- 路径必须相对于项目根目录，禁止保存密钥和本机信息。 -->",
            "",
        ]
    )


def default_targets() -> str:
    """生成可编辑的默认目标注册表。Returns: JSON 文本。Author: lvdaxianer@yeah.net。Date: 2026-10-26。"""
    return json.dumps({"targets": list(DEFAULT_TARGETS)}, ensure_ascii=False, indent=2) + "\n"


def scaffold(root: Path) -> list[str]:
    """创建缺失的事实源文件且不覆盖已有文件。Args: root。Returns: 新建相对路径。Author: lvdaxianer@yeah.net。Date: 2026-10-26。"""
    context_dir = resolve_target(root, CONTEXT_DIR, "context directory")
    context_dir.mkdir(parents=True, exist_ok=True)
    created = []
    for name in STARTER_FILES:
        path = context_dir / name
        if not path.exists():
            path.write_text(starter_content(name.removesuffix(".md")), encoding="utf-8")
            created.append(display_path(path, root))
    config_path = context_dir / "targets.json"
    if not config_path.exists():
        config_path.write_text(default_targets(), encoding="utf-8")
        created.append(display_path(config_path, root))
    return created


def load_context(root: Path, context_dir: Path) -> str:
    """读取 Markdown 并以相对来源标记合并。Args: root、context_dir。Returns: 合并后的上下文。Raises: ContextError。Author: lvdaxianer@yeah.net。Date: 2026-10-26。"""
    documents = []
    for path in sorted(context_dir.glob("*.md")):
        if path.name == "README.md":
            continue
        # 上下文源文件也必须留在仓库内，避免通过符号链接读取外部内容。
        resolve_target(root, display_path(path, root), "context file")
        content = path.read_text(encoding="utf-8")
        validate_text(content, display_path(path, root))
        if content.strip():
            source = display_path(path, root)
            documents.append(f"## Source: {source}\n\n{content.strip()}")
    if not documents:
        raise ContextError(".project-context 中没有可同步的 Markdown 内容")
    return "# Project Startup Context\n\n" + "\n\n".join(documents)


def managed_block(context: str) -> str:
    """生成目标文件中的完整托管区块。Args: context。Returns: 托管区块文本。Author: lvdaxianer@yeah.net。Date: 2026-10-26。"""
    return f"{BEGIN_MARKER}\n{context.rstrip()}\n{END_MARKER}"


def replace_managed(existing: str, block: str, label: str) -> str:
    """替换唯一托管区块并保留区块外内容。Args: existing、block、label。Returns: 更新文本。Raises: ContextError。Author: lvdaxianer@yeah.net。Date: 2026-10-26。"""
    starts = existing.count(BEGIN_MARKER)
    ends = existing.count(END_MARKER)
    if starts != ends or starts > 1:
        raise ContextError(f"{label}: managed-block-invalid")
    if starts == 0:
        separator = "" if not existing or existing.endswith("\n") else "\n"
        return existing + separator + block + "\n"
    start = existing.index(BEGIN_MARKER)
    finish = existing.index(END_MARKER, start) + len(END_MARKER)
    return existing[:start] + block + existing[finish:]


def plan_targets(root: Path, targets: list[dict], block: str) -> list[tuple[Path, str, str]]:
    """计算目标文件变更且不执行写入。Args: root、targets、block。Returns: 目标计划。Author: lvdaxianer@yeah.net。Date: 2026-10-26。"""
    plan = []
    for target in targets:
        path = resolve_target(root, target["file"], f"target {target['name']}")
        existing = path.read_text(encoding="utf-8") if path.exists() else ""
        updated = replace_managed(existing, block, target["file"])
        if path.exists() and BEGIN_MARKER not in existing and END_MARKER not in existing:
            action = "missing-managed"
        else:
            action = "unchanged" if updated == existing else "updated"
        plan.append((path, action, updated))
    return plan


def write_plan(root: Path, plan: list[tuple[Path, str, str]]) -> list[str]:
    """按计划写入目标文件并返回相对路径。Args: root、plan。Returns: 变更路径。Author: lvdaxianer@yeah.net。Date: 2026-10-26。"""
    changed = []
    for path, action, content in plan:
        if action == "unchanged":
            continue
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        changed.append(display_path(path, root))
    return changed


def report(mode: str, created: list[str], changed: list[str], warnings: list[str]) -> None:
    """输出不含绝对路径的执行摘要。Args: mode、created、changed、warnings。Returns: None。Author: lvdaxianer@yeah.net。Date: 2026-10-26。"""
    sys.stdout.write(f"operation: {mode}\n")
    sys.stdout.write(f"created: {len(created)}\n")
    metric = "planned" if mode == "preview" else "updated"
    sys.stdout.write(f"{metric}: {len(changed)}\n")
    sys.stdout.write(f"warnings: {len(warnings)}\n")
    for item in created + changed + warnings:
        sys.stdout.write(f"- {item}\n")


def execute(mode: str, root: Path) -> int:
    """执行 init、sync、preview 或 verify。Args: mode、root。Returns: 进程状态码。Raises: ContextError。Author: lvdaxianer@yeah.net。Date: 2026-10-26。"""
    context_dir = resolve_target(root, CONTEXT_DIR, "context directory")
    created = scaffold(root) if mode == "init" else []
    config_path = context_dir / "targets.json"
    targets = load_targets(root, config_path)
    context = load_context(root, context_dir)
    plan = plan_targets(root, targets, managed_block(context))
    validate_verify(mode, root, plan)
    changed = select_changes(mode, root, plan)
    report(mode, created, changed, missing_targets(mode, root, plan))
    return 0


def missing_targets(mode: str, root: Path, plan: list[tuple[Path, str, str]]) -> list[str]:
    """返回 preview 中尚未存在的目标。Args: mode、root、plan。Returns: 相对路径列表。Author: lvdaxianer@yeah.net。Date: 2026-10-26。"""
    if mode != "preview":
        return []
    return [display_path(path, root) for path, _, _ in plan if not path.exists()]


def validate_verify(mode: str, root: Path, plan: list[tuple[Path, str, str]]) -> None:
    """在 verify 下拒绝缺失目标或托管区块。Args: mode、root、plan。Raises: ContextError。Author: lvdaxianer@yeah.net。Date: 2026-10-26。"""
    missing = [display_path(path, root) for path, _, _ in plan if not path.exists()]
    missing_managed = [
        display_path(path, root) for path, action, _ in plan if action == "missing-managed"
    ]
    if mode == "verify" and (missing or missing_managed):
        problems = [f"missing-target: {', '.join(missing)}"] if missing else []
        if missing_managed:
            problems.append(f"managed-block-missing: {', '.join(missing_managed)}")
        raise ContextError("; ".join(problems))


def select_changes(mode: str, root: Path, plan: list[tuple[Path, str, str]]) -> list[str]:
    """根据模式选择预览、验证或写入。Args: mode、root、plan。Returns: 变更路径。Author: lvdaxianer@yeah.net。Date: 2026-10-26。"""
    if mode == "preview":
        return [display_path(path, root) for path, action, _ in plan if action != "unchanged"]
    if mode == "verify":
        return []
    return write_plan(root, plan)


def parse_args(arguments: list[str]) -> argparse.Namespace:
    """解析 CLI 参数且不持久化 root。Args: arguments。Returns: 参数对象。Author: lvdaxianer@yeah.net。Date: 2026-10-26。"""
    parser = argparse.ArgumentParser(description="同步项目启动上下文")
    parser.add_argument("mode", choices=("init", "sync", "preview", "verify"))
    parser.add_argument("--root", default=".", help="项目根目录，仅用于本次运行")
    return parser.parse_args(arguments)


def main(arguments: list[str]) -> int:
    """执行命令并转换可预期错误。Args: arguments。Returns: 进程状态码。Author: lvdaxianer@yeah.net。Date: 2026-10-26。"""
    try:
        options = parse_args(arguments)
        root = Path(options.root).resolve()
        return execute(options.mode, root)
    except ContextError as error:
        sys.stderr.write(f"error: {error}\n")
        return 2
    except OSError:
        # 文件系统异常不得回显包含本机绝对路径的底层错误文本。
        sys.stderr.write("error: filesystem-error\n")
        return 2


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
