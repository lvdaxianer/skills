#!/usr/bin/env bash
set -euo pipefail

usage() { echo "usage: $0 --fixture | --service-root ROOT --release-id ID [--execute]" >&2; exit 2; }
resolve_physical() {
  if readlink -f -- "$1" 2>/dev/null; then return 0; fi
  case "$1" in
    /*) CDPATH= cd -P -- "$1" 2>/dev/null && pwd -P || return 1 ;;
    *) CDPATH= cd -P -- "$(dirname -- "$1")" && printf '%s/%s\n' "$(pwd -P)" "$(basename -- "$1")" ;;
  esac
}
assert_under() {
  case "$1" in
    "$2"/*) ;;
    *) echo "path escape: $1 not under $2" >&2; exit 1 ;;
  esac
}
run_fixture() {
  local root release out1 out2
  root=$(mktemp -d "${TMPDIR:-/tmp}/service-contract.XXXXXX")
  trap 'rm -rf -- "$root"' EXIT
  release=demo-20261028120000-manual-001
  mkdir -p "$root/releases/$release/bin" "$root/conf" "$root/logs" "$root/run" "$root/release-records"
  cat > "$root/releases/$release/bin/start.sh" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
resolve() { readlink -f -- "$1" 2>/dev/null || (CDPATH= cd -P -- "$(dirname -- "$1")" && printf '%s/%s\n' "$(pwd -P)" "$(basename -- "$1")"); }
script=$(resolve "$0")
script_dir=$(CDPATH= cd -P -- "$(dirname -- "$script")" && pwd -P)
service_root=$(CDPATH= cd -P -- "$script_dir/../../.." && pwd -P)
current=$(resolve "$service_root/current")
releases=$(CDPATH= cd -P -- "$service_root/releases" && pwd -P)
case "$current" in "$releases"/*) ;; *) exit 64 ;; esac
printf 'service_root=%s\nreleases=%s\ncurrent=%s\n' "$service_root" "$releases" "$current"
EOF
  chmod 0750 "$root/releases/$release/bin/start.sh"
  ln -s "releases/$release" "$root/current"
  out1=$(CONTRACT_TEST_ONLY=1 "$root/current/bin/start.sh")
  out2=$(CONTRACT_TEST_ONLY=1 "$root/releases/$release/bin/start.sh")
  test "$out1" = "$out2"
  printf '%s\n' "$out1"
  echo 'contract fixture: PASS'
}

fixture=0
execute=0
root=
release=
while [ "$#" -gt 0 ]; do
  case "$1" in
    --fixture) fixture=1; shift ;;
    --service-root) root=${2:-}; shift 2 ;;
    --release-id) release=${2:-}; shift 2 ;;
    --execute) execute=1; shift ;;
    *) usage ;;
  esac
done

if [ "$fixture" -eq 1 ]; then run_fixture; exit 0; fi
[ -n "$root" ] && [ -n "$release" ] || usage
root=$(resolve_physical "$root")
releases=$(resolve_physical "$root/releases")
current=$(resolve_physical "$root/current")
assert_under "$current" "$releases"
test -d "$root/releases/$release"
test -x "$root/current/bin/start.sh" && test -x "$root/releases/$release/bin/start.sh"
if [ "$execute" -eq 1 ]; then
  current_out=$(mktemp)
  release_out=$(mktemp)
  trap 'rm -f -- "$current_out" "$release_out"' EXIT
  CONTRACT_TEST_ONLY=1 "$root/current/bin/start.sh" >"$current_out"
  CONTRACT_TEST_ONLY=1 "$root/releases/$release/bin/start.sh" >"$release_out"
  cmp "$current_out" "$release_out"
fi
printf 'service_root=%s\nreleases=%s\ncurrent=%s\nrelease=%s\ncontract: PASS\n' "$root" "$releases" "$current" "$release"
