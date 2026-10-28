#!/usr/bin/env bash
set -euo pipefail

usage() { echo "usage: $0 preview|apply SERVICE_ROOT [COUNT] [--apply]" >&2; exit 2; }
resolve_existing() {
  if readlink -f -- "$1" 2>/dev/null; then return 0; fi
  CDPATH= cd -P -- "$1" && pwd -P
}
contains_line() { printf '%b\n' "$1" | grep -F -x -- "$2" >/dev/null 2>&1; }

mode=${1:-}
root=${2:-}
count=${3:-5}
apply=0
[ "$mode" = preview ] || [ "$mode" = apply ] || usage
[ -n "$root" ] || usage
for arg in "$@"; do [ "$arg" = --apply ] && apply=1; done
case "$count" in ''|*[!0-9]*) echo 'count must be a non-negative integer' >&2; exit 2 ;; esac
root=$(resolve_existing "$root")
releases=$(resolve_existing "$root/releases")
case "$releases" in "$root"/releases) ;; *) echo 'invalid releases boundary' >&2; exit 1 ;; esac
test -d "$releases" || { echo 'releases directory missing' >&2; exit 1; }
current=$(readlink -f -- "$root/current" 2>/dev/null || true)
current_boundary=ok
if [ -d "$root/current" ] && [ ! -L "$root/current" ]; then
  current_boundary=regular_directory
  echo 'current is a regular directory; apply is blocked' >&2
elif [ -e "$root/current" ] || [ -L "$root/current" ]; then
  case "$current" in
    "$releases"/*) ;;
    *) current_boundary=orphan_or_escape; echo 'current is orphaned or outside releases; apply is blocked' >&2 ;;
  esac
else
  current_boundary=missing
  echo 'current is missing; apply is blocked' >&2
fi
protected_ids=
known_ids=
verified_ids=
[ -n "$current" ] && protected_ids="$(basename -- "$current")\n"
extract() { sed -n "s/.*\"$1\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p" "$2" | head -n 1; }
for record in "$root"/release-records/*.json; do
  [ -f "$record" ] || continue
  rel_id=$(extract release_id "$record" || true)
  rel_state=$(extract status "$record" || true)
  previous=$(extract previous_release "$record" || true)
  [ -n "$rel_id" ] && known_ids="${known_ids}${rel_id}\n"
  [ -n "$previous" ] && protected_ids="${protected_ids}${previous}\n"
  case "$rel_state" in
    verified) verified_ids="${verified_ids}${rel_id}\n" ;;
    failed|rolled-back|prepared|validated|stopped|switched|started|'') protected_ids="${protected_ids}${rel_id}\n" ;;
  esac
done
for dir in "$releases"/*; do
  [ -d "$dir" ] || continue
  rel_id=$(basename -- "$dir")
  case "$rel_id" in
    [a-z0-9]*-[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]-[A-Za-z0-9]*-[0-9][0-9][0-9]) : ;;
    *) protected_ids="${protected_ids}${rel_id}\n"; continue ;;
  esac
  contains_line "$known_ids" "$rel_id" || protected_ids="${protected_ids}${rel_id}\n"
done
newest=$(printf '%b' "$verified_ids" | sort -r | head -n "$count")
protected_ids="${protected_ids}$(printf '%s\n' "$newest")"
deleted_ids=
for dir in "$releases"/*; do
  [ -d "$dir" ] || continue
  rel_id=$(basename -- "$dir")
  contains_line "$protected_ids" "$rel_id" && continue
  resolved=$(resolve_existing "$dir")
  case "$resolved" in "$releases"/*) ;; *) echo "refusing unsafe candidate: $rel_id" >&2; continue ;; esac
  [ "$(dirname -- "$resolved")" = "$releases" ] || { echo "refusing nested candidate: $rel_id" >&2; continue; }
  deleted_ids="${deleted_ids}${rel_id}\n"
done
printf 'service_root=%s\nkeep_count=%s\ndeleted_releases=%s\n' "$root" "$count" "$(printf '%b' "$deleted_ids" | sed '/^$/d' | tr '\n' ' ' | sed 's/ $//' | sed 's/^$/none/')"
if [ "$mode" = apply ] && [ "$apply" -eq 1 ]; then
  [ "$current_boundary" = ok ] || { echo 'apply_status=blocked' ; exit 1; }
  while IFS= read -r rel_id; do
    [ -n "$rel_id" ] || continue
    candidate="$releases/$rel_id"
    resolved=$(resolve_existing "$candidate")
    case "$resolved" in "$releases"/*) ;; *) echo "refusing delete: $rel_id" >&2; exit 1 ;; esac
    [ "$(dirname -- "$resolved")" = "$releases" ] || exit 1
    rm -rf -- "$resolved"
  done <<EOF
$(printf '%b' "$deleted_ids")
EOF
  echo 'apply_status=applied'
else
  echo 'apply_status=preview_only'
fi
