#!/usr/bin/env bash
set -euo pipefail

# 这个脚本只检查交付包，不安装运行时、不连接客户环境、不修改包内容。
usage() {
  echo "用法：$0 <package-root>" >&2
}

if [ "$#" -ne 1 ]; then
  usage
  exit 2
fi

package_root=$(cd "$1" 2>/dev/null && pwd -P) || {
  echo "部署包目录不存在或不可访问" >&2
  exit 1
}

manifest="$package_root/package-manifest.json"
checksums="$package_root/checksums.sha256"
test -f "$manifest" || { echo "缺少 package-manifest.json" >&2; exit 1; }
test -f "$checksums" || { echo "缺少 checksums.sha256" >&2; exit 1; }

# 用 Python 标准库读取清单，避免依赖现场未必安装的 jq 或第三方库。
python3 - "$package_root" "$manifest" <<'PY'
import hashlib
import json
import os
import re
import sys
from pathlib import Path

root = Path(sys.argv[1]).resolve()
manifest_path = Path(sys.argv[2]).resolve()


def fail(message):
    """输出不含敏感值的失败原因并立即终止校验。"""
    print(message, file=sys.stderr)
    raise SystemExit(1)


def relative_path(value, field):
    """校验清单路径为包根目录内的安全相对路径。"""
    if not isinstance(value, str) or not value or "\x00" in value or value.startswith("/"):
        fail(f"{field} 不是安全相对路径")
    parts = Path(value).parts
    if ".." in parts or "" in parts:
        fail(f"{field} 包含越界路径")
    return value


def read_manifest():
    """读取 JSON 清单，只报告异常类型，不输出文件内容。"""
    try:
        return json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        fail(f"无法读取 package-manifest.json：{type(error).__name__}")


def check_identity(manifest):
    """校验包身份、版本格式、来源提交和部署模式。"""
    if not isinstance(manifest, dict):
        fail("package-manifest.json 顶层必须是对象")
    required = {
        "schema_version", "package_name", "package_version", "application_version",
        "build_time", "source_commit", "supported_modes", "supported_os",
        "architectures", "offline_supported", "entrypoints", "mode_payloads", "files",
    }
    missing = sorted(required.difference(manifest))
    if missing:
        fail(f"manifest 缺少字段：{', '.join(missing)}")
    if not isinstance(manifest["package_version"], str) or not isinstance(manifest["source_commit"], str):
        fail("package_version 和 source_commit 必须是字符串")
    if not isinstance(manifest["supported_modes"], list) or not isinstance(manifest["entrypoints"], dict):
        fail("supported_modes 必须是数组，entrypoints 必须是对象")
    if not isinstance(manifest["mode_payloads"], dict) or not isinstance(manifest["files"], list):
        fail("mode_payloads 必须是对象，files 必须是数组")
    version = manifest["package_version"]
    if not re.fullmatch(r"(?!latest$|final$|release$)[A-Za-z0-9][A-Za-z0-9._+~-]{0,63}", version):
        fail("package_version 无效或使用了不可追溯名称")
    if manifest["source_commit"] != "manual" and not re.fullmatch(r"[A-Fa-f0-9]{7,64}", manifest["source_commit"]):
        fail("source_commit 必须是提交号或 manual")
    if not manifest["supported_modes"]:
        fail("supported_modes 不能为空")
    allowed = {"vm", "docker", "kubernetes"}
    if not set(manifest["supported_modes"]).issubset(allowed):
        fail("supported_modes 含未知部署方式")


def check_entrypoints(manifest):
    """校验五个实施入口存在且具有执行权限。"""
    required = {"deploy", "service", "doctor", "rollback", "uninstall"}
    entries = manifest["entrypoints"]
    missing = sorted(required.difference(entries))
    if missing:
        fail(f"entrypoints 缺少：{', '.join(missing)}")
    for name in sorted(required):
        path = root / relative_path(entries[name], f"entrypoints.{name}")
        if not path.is_file() or not os.access(path, os.X_OK):
            fail(f"入口不存在或不可执行：{entries[name]}")


def check_modes(manifest):
    """校验每个支持模式的目录和必需材料。"""
    payloads = manifest["mode_payloads"]
    unsupported = manifest.get("unsupported_modes", {})
    for mode in sorted(manifest["supported_modes"]):
        payload = payloads.get(mode)
        if not isinstance(payload, dict):
            fail(f"缺少模式 payload：{mode}")
        payload_path = root / relative_path(payload.get("path", ""), f"mode_payloads.{mode}.path")
        if not payload_path.is_dir():
            fail(f"模式目录不存在：{payload_path.relative_to(root)}")
        for item in payload.get("required_files", []):
            target = root / relative_path(item, f"mode_payloads.{mode}.required_files")
            if not target.is_file():
                fail(f"模式必需文件不存在：{item}")
    for mode in sorted({"vm", "docker", "kubernetes"}.difference(manifest["supported_modes"])):
        if not unsupported.get(mode):
            fail(f"未支持模式缺少原因：{mode}")


def check_files(manifest):
    """校验 manifest 中每个文件的存在性和 SHA-256。"""
    for item in manifest["files"]:
        path = relative_path(item.get("path", ""), "files.path")
        target = root / path
        if not target.is_file():
            fail(f"清单文件不存在：{path}")
        digest = hashlib.sha256(target.read_bytes()).hexdigest()
        if digest.lower() != item.get("sha256", "").lower():
            fail(f"文件 SHA-256 不匹配：{path}")


def check_checksum_file():
    """校验 checksums 文件且禁止引用包根目录之外的路径。"""
    checksum_path = root / "checksums.sha256"
    for line_number, line in enumerate(checksum_path.read_text(encoding="utf-8").splitlines(), start=1):
        if not line.strip():
            continue
        fields = line.split(maxsplit=1)
        if len(fields) != 2 or not re.fullmatch(r"[A-Fa-f0-9]{64}", fields[0]):
            fail(f"checksums.sha256 第 {line_number} 行格式无效")
        path_value = fields[1][1:] if fields[1].startswith("*") else fields[1]
        path_value = relative_path(path_value, "checksums.sha256")
        target = root / path_value
        if not target.is_file():
            fail(f"checksums.sha256 引用了不存在文件：{path_value}")
        digest = hashlib.sha256(target.read_bytes()).hexdigest()
        if digest.lower() != fields[0].lower():
            fail(f"checksums.sha256 校验失败：{path_value}")


def check_links_and_secrets():
    """拒绝越界链接、特殊文件和明显敏感文件名。"""
    forbidden_names = {".env", "credentials", "id_rsa"}
    secret_markers = (b"-----BEGIN PRIVATE KEY-----", b"password=", b"token=")
    text_suffixes = {".conf", ".env", ".json", ".md", ".properties", ".sh", ".template", ".txt", ".yaml", ".yml"}
    for path in root.rglob("*"):
        if not path.is_dir() and not path.is_file() and not path.is_symlink():
            fail(f"包内存在非普通文件：{path.relative_to(root)}")
        if path.is_symlink():
            target = path.resolve()
            if root not in target.parents and target != root:
                fail(f"符号链接越界：{path.relative_to(root)}")
        name = path.name.lower()
        if name in forbidden_names or "credentials" in name or any(name.endswith(suffix) for suffix in (".pem", ".key")):
            fail(f"包内疑似敏感文件：{path.relative_to(root)}")
        if path.is_file() and path.suffix.lower() in text_suffixes and any(marker in path.read_bytes() for marker in secret_markers):
            fail(f"包内疑似敏感内容：{path.relative_to(root)}")


def main():
    """按固定顺序执行所有只读包契约检查。"""
    manifest = read_manifest()
    check_identity(manifest)
    check_entrypoints(manifest)
    check_modes(manifest)
    check_files(manifest)
    check_checksum_file()
    check_links_and_secrets()


main()
PY

echo "部署包契约校验通过：$package_root"
