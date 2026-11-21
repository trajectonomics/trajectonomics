#!/usr/bin/env bash
# Push the renamed tags listed in tags.txt (format: "<tag> <commit-sha>").
#
# Run this only AFTER the import PR is merged with "Create a merge commit". The
# script refuses to push a tag whose commit is not on origin/main, which is what
# happens if the PR was squashed or rebased (the imported history would be gone).
#
# Tags that already exist on origin are skipped, so it is safe to re-run.
set -euo pipefail

ROOT=$(git rev-parse --show-toplevel)
cd "$ROOT"
git fetch --quiet origin main --tags

remote_tags=$(git ls-remote --tags --refs origin | awk '{print $2}' | sed 's#^refs/tags/##')
refspecs=()
while read -r tag sha; do
	[ -n "$tag" ] || continue
	if grep -qxF "$tag" <<<"$remote_tags"; then
		echo "skip  $tag (exists on origin)"
		continue
	fi
	if ! git merge-base --is-ancestor "$sha" origin/main; then
		echo "push-tags.sh: $tag -> $sha is not on origin/main. Was the import PR squashed or rebased?" >&2
		exit 1
	fi
	refspecs+=("$sha:refs/tags/$tag")
	echo "push  $tag -> $sha"
done <"$ROOT/tooling/migrate/tags.txt"

if [ ${#refspecs[@]} -eq 0 ]; then
	echo "nothing to push"
	exit 0
fi
git push origin "${refspecs[@]}"
