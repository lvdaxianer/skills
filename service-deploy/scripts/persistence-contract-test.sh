#!/usr/bin/env bash
set -euo pipefail

# 这个脚本只读取并校验持久化清单，不创建目录、不连接集群、不修改部署状态。
usage() {
  echo "用法：$0 <persistence-manifest.json>" >&2
}

if [ "$#" -ne 1 ]; then
  usage
  exit 2
fi

manifest=$1
test -f "$manifest" || {
  echo "持久化清单不存在或不可访问" >&2
  exit 1
}

python3 - "$manifest" <<'PY'
import json
import sys
from pathlib import PurePosixPath

MANIFEST_PATH = sys.argv[1]
SUPPORTED_MODES = {"vm", "docker", "kubernetes"}
REQUIRED_RESOURCE_CLASSES = {
    "frontend",
    "backend",
    "lib",
    "conf",
    "database",
    "object-storage",
}
RESOURCE_CLASSES = REQUIRED_RESOURCE_CLASSES | {
    "data",
    "logs",
    "index",
    "extension",
}
DECISIONS = {"host-persistent", "cluster-persistent", "external-managed"}
CONFIRMED = "confirmed"
FORBIDDEN_CONTAINER_PATHS = {
    "/",
    "/app",
    "/app/entrypoint.sh",
    "/var/run/docker.sock",
}
FORBIDDEN_CONTAINER_SUBTREES = ("/app/bin", "/app/lib", "/app/html")
CODE_RESOURCE_CLASSES = {"frontend", "backend", "lib", "conf", "extension"}


def fail(message):
    """输出不含敏感值的失败原因并结束校验。"""
    print(message, file=sys.stderr)
    raise SystemExit(1)


def read_manifest():
    """读取 JSON 清单并把解析错误转换成稳定失败原因。"""
    try:
        with open(MANIFEST_PATH, encoding="utf-8") as stream:
            return json.load(stream)
    except (OSError, json.JSONDecodeError) as error:
        fail(f"无法读取持久化清单：{type(error).__name__}")


def require_object(value, field):
    """要求字段为 JSON 对象。"""
    if not isinstance(value, dict):
        fail(f"{field} 必须是对象")


def require_text(value, field):
    """要求字段为非空字符串。"""
    if not isinstance(value, str) or not value.strip():
        fail(f"{field} 必须是非空字符串")


def safe_absolute_path(value, field):
    """校验绝对路径、拒绝空字节和路径穿越。"""
    require_text(value, field)
    if chr(0) in value or chr(10) in value or not value.startswith("/"):
        fail(f"{field} 必须是安全绝对路径")
    if ".." in PurePosixPath(value).parts:
        fail(f"{field} 包含路径穿越")


def check_header(manifest):
    """校验顶层字段和部署模式。"""
    require_object(manifest, "manifest")
    for field in ("schema_version", "service", "deployment_mode", "service_root", "resources"):
        if field not in manifest:
            fail(f"manifest 缺少字段：{field}")
    if manifest["schema_version"] != "1":
        fail("schema_version 必须是 1")
    if manifest["deployment_mode"] not in SUPPORTED_MODES:
        fail("deployment_mode 不是支持的部署方式")
    safe_absolute_path(manifest["service_root"], "service_root")
    if not isinstance(manifest["resources"], list) or not manifest["resources"]:
        fail("resources 必须是非空数组")


def check_confirmation(item, resource_class):
    """校验客户确认、备份和恢复责任。"""
    confirmation = item.get("confirmation")
    require_object(confirmation, f"{resource_class}.confirmation")
    if confirmation.get("status") != CONFIRMED:
        fail(f"{resource_class} 未完成客户确认")
    for field in ("confirmer", "confirmed_at", "record_path"):
        require_text(confirmation.get(field), f"{resource_class}.confirmation.{field}")
    safe_absolute_path(confirmation["record_path"], f"{resource_class}.confirmation.record_path")
    require_text(item.get("restore_procedure"), f"{resource_class}.restore_procedure")
    if item.get("backup") not in {"required", "recommended", "not_required"}:
        fail(f"{resource_class}.backup 无效")


def check_mount_boundary(item, resource_class):
    """校验容器路径并拒绝覆盖镜像根目录。"""
    container_path = item.get("container_path")
    safe_absolute_path(container_path, f"{resource_class}.container_path")
    if container_path in FORBIDDEN_CONTAINER_PATHS:
        fail(f"{resource_class} 不得覆盖镜像资源根路径")
    for forbidden in FORBIDDEN_CONTAINER_SUBTREES:
        if container_path == forbidden or container_path.startswith(f"{forbidden}/"):
            fail(f"{resource_class} 不得覆盖镜像资源根路径")
    if item.get("override_allowed") and not container_path.startswith("/app/overrides/"):
        fail(f"{resource_class} 的覆盖必须使用独立 extension point")
    if resource_class in CODE_RESOURCE_CLASSES and item.get("read_only") is not True:
        fail(f"{resource_class} 覆盖必须只读")


def check_host_target(item, resource_class, mode):
    """校验 Docker/VM 的宿主机持久化目标。"""
    if mode == "kubernetes":
        fail(f"{resource_class} 不能在 Kubernetes 使用宿主机路径")
    safe_absolute_path(item.get("host_path"), f"{resource_class}.host_path")
    if "pvc" in item or "hostPath" in item:
        fail(f"{resource_class} 的 Docker/VM 清单包含错误存储字段")


def check_cluster_target(item, resource_class, mode):
    """校验 Kubernetes 的现有 PVC/PV 目标并拒绝 hostPath。"""
    if mode != "kubernetes":
        fail(f"{resource_class} 只能在 Kubernetes 使用 PVC/PV")
    if "hostPath" in item or "host_path" in item:
        fail(f"{resource_class} 禁止使用 hostPath 或宿主机路径")
    pvc = item.get("pvc")
    require_object(pvc, f"{resource_class}.pvc")
    for field in ("name", "namespace", "storage_class"):
        require_text(pvc.get(field), f"{resource_class}.pvc.{field}")
    if pvc.get("bound") is not True:
        fail(f"{resource_class} PVC/PV 尚未绑定")


def check_external_target(item, resource_class):
    """校验外部托管资源的责任和恢复证据。"""
    for field in ("external_owner", "endpoint_ref", "recovery_evidence"):
        require_text(item.get(field), f"{resource_class}.{field}")
    if "host_path" in item or "pvc" in item or "hostPath" in item:
        fail(f"{resource_class} 外部托管不能混用本地挂载")


def check_resource(item, mode, seen):
    """校验单个资源条目的分类、确认和模式目标。"""
    require_object(item, "resources.item")
    resource_class = item.get("resource_class")
    if resource_class not in RESOURCE_CLASSES:
        fail("resources 包含未知 resource_class")
    if resource_class in seen:
        fail(f"resources 重复 resource_class：{resource_class}")
    seen.add(resource_class)
    if not isinstance(item.get("default_in_image"), bool):
        fail(f"{resource_class}.default_in_image 必须是布尔值")
    if not isinstance(item.get("read_only"), bool) or not isinstance(item.get("override_allowed"), bool):
        fail(f"{resource_class} 的读写/覆盖标记必须是布尔值")
    if item.get("persistence_decision") not in DECISIONS:
        fail(f"{resource_class}.persistence_decision 无效")
    check_confirmation(item, resource_class)
    check_mount_boundary(item, resource_class)
    decision = item["persistence_decision"]
    if decision == "host-persistent":
        check_host_target(item, resource_class, mode)
    elif decision == "cluster-persistent":
        check_cluster_target(item, resource_class, mode)
    else:
        check_external_target(item, resource_class)


def check_resources(manifest):
    """校验默认资源是否完整且每项只出现一次。"""
    seen = set()
    for item in manifest["resources"]:
        check_resource(item, manifest["deployment_mode"], seen)
    missing = REQUIRED_RESOURCE_CLASSES.difference(seen)
    if missing:
        fail(f"resources 缺少默认资源确认项：{', '.join(sorted(missing))}")


def main():
    """按固定顺序执行持久化资源合同检查。"""
    manifest = read_manifest()
    check_header(manifest)
    check_resources(manifest)
    print("持久化资源合同校验通过")


main()
PY
