#!/usr/bin/env bash
# Import org repos into this monorepo with their full git history.
# docs/monorepo-migration.md §1 ("How history is kept") explains the approach.
#
# For each repo below: clone it fresh into a temp dir, rewrite that clone with
# git-filter-repo so every commit already has its files under <dest> and every tag
# is renamed <prefix>-<tag>, then merge the rewritten history into the current
# branch with --allow-unrelated-histories.
#
# Safety:
#   - History is rewritten ONLY inside the throwaway clones under a mktemp dir.
#     This repo's own history is never rewritten; it only gains merge commits.
#   - Renamed tags are never created under refs/tags here. They go to tags.txt and
#     are pushed by push-tags.sh only after the import PR is merged.
#   - Each import is checked before moving on: the <dest> tree must be byte-identical
#     to the source repo's HEAD tree, and the merged history must hold exactly the
#     source's commit count.
#
# Idempotent: a repo whose <dest> already exists in HEAD is skipped, so adding an
# entry and re-running imports only the new repo.
#
# Usage: tooling/migrate/import.sh        (from a clean working tree)
set -euo pipefail

ORG=trajectonomics
TRAILER="Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"

#        repo             dest                   tag prefix
REPOS=(
	"money            packages/money         money"
	"ledger-core      packages/ledger        ledger"
	"tax-core         packages/tax           tax"
	"sim-core         packages/sim           sim"
	"design-system    packages/brand         brand"
	"cli              apps/cli               cli"
	"site             apps/site              site"
	"docs             apps/docs              docs"
	"blog             apps/blog              blog"
	"skills           skills/customer        skills"
	"internal-skills  skills/internal        internal-skills"
	"goals            org/goals              goals"
)

ROOT=$(git rev-parse --show-toplevel)
HERE="$ROOT/tooling/migrate"
cd "$ROOT"

die() { echo "import.sh: $*" >&2; exit 1; }

[ -z "$(git status --porcelain)" ] || die "working tree is not clean; commit or stash first"
command -v uvx >/dev/null || die "uvx is required (it runs git-filter-repo)"
git symbolic-ref -q HEAD >/dev/null || die "HEAD is detached; check out a branch"

WORK=$(mktemp -d)
cleanup() {
	rm -rf "$WORK"
	git for-each-ref --format='%(refname)' refs/migrate/ refs/migrate-tags/ |
		while read -r ref; do git update-ref -d "$ref"; done
}
trap cleanup EXIT

touch "$HERE/sources.tsv" "$HERE/tags.txt"
imported=0

for entry in "${REPOS[@]}"; do
	read -r repo dest prefix <<<"$entry"

	if git cat-file -e "HEAD:$dest" 2>/dev/null; then
		echo "skip   $repo (already at $dest)"
		continue
	fi

	clone="$WORK/$repo"
	git clone --quiet --single-branch --branch main "https://github.com/$ORG/$repo.git" "$clone"
	src_sha=$(git -C "$clone" rev-parse HEAD)
	src_tree=$(git -C "$clone" rev-parse 'HEAD^{tree}')
	src_commits=$(git -C "$clone" rev-list --count HEAD)
	src_tags=$(git -C "$clone" tag --merged HEAD | wc -l | tr -d ' ')

	# The rewrite runs inside the throwaway clone, never in this repo.
	(cd "$clone" && uvx git-filter-repo --quiet --force \
		--to-subdirectory-filter "$dest" \
		--tag-rename ":$prefix-")

	git fetch --quiet --no-tags "$clone" \
		"+refs/heads/main:refs/migrate/$prefix" \
		"+refs/tags/*:refs/migrate-tags/*"

	git merge --quiet --no-ff --allow-unrelated-histories --no-edit \
		-m "chore(migrate): import $ORG/$repo history into $dest" \
		-m "Source: https://github.com/$ORG/$repo at $src_sha ($src_commits commits, $src_tags tags)." \
		-m "$TRAILER" \
		"refs/migrate/$prefix"

	got_tree=$(git rev-parse "HEAD:$dest")
	got_commits=$(git rev-list --count HEAD^2)
	[ "$got_tree" = "$src_tree" ] ||
		die "$repo: tree mismatch at $dest ($got_tree, source $src_tree)"
	[ "$got_commits" = "$src_commits" ] ||
		die "$repo: imported $got_commits commits, source has $src_commits"

	# Record every renamed tag whose commit is now in this history.
	git for-each-ref --format='%(refname:strip=2) %(objectname)' "refs/migrate-tags/$prefix-*" |
		while read -r tag obj; do
			sha=$(git rev-parse "$obj^{commit}")
			if git merge-base --is-ancestor "$sha" HEAD; then echo "$tag $sha"; fi
		done >>"$HERE/tags.txt"
	got_tags=$(grep -c "^$prefix-" "$HERE/tags.txt" || true)
	[ "$got_tags" = "$src_tags" ] ||
		die "$repo: recorded $got_tags tags, source has $src_tags on main"

	printf '%s\t%s\t%s\t%s\t%s\t%s\n' \
		"$repo" "$dest" "$prefix" "$src_sha" "$src_commits" "$src_tags" >>"$HERE/sources.tsv"
	echo "import $repo -> $dest: $src_commits commits, $src_tags tags, tree verified"
	imported=$((imported + 1))
done

sort -u -o "$HERE/tags.txt" "$HERE/tags.txt"
sort -u -o "$HERE/sources.tsv" "$HERE/sources.tsv"
echo "done: $imported imported. Commit tooling/migrate/sources.tsv and tags.txt."
