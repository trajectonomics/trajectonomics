/**
 * The CLI Range ceiling check, run after each stable release and weekly. When npm's `latest`
 * `@trajectonomics/cli` has reached a published Skill's upper bound, that Skill needs its recheck, so
 * one issue names it. The upper bound is a recheck marker, not a compatibility claim
 * ([ADR 0004](../docs/adr/0004-the-cli-range-ceiling-is-a-recheck-marker.md)).
 *
 *   bun scripts/cli-range-ceiling.ts --latest <version> --open <file of open issue titles>
 *
 * Prints one JSON line per issue to open, `{"title": ..., "body": ...}`. The workflow opens them, so
 * this file does no network access and changes nothing.
 */
import { readFileSync } from "node:fs"
import { cliRangeCeiling } from "./cli-range"
import { MANIFEST_PATH, type ManifestRow, parseSkillManifest } from "./skills-manifest"

/** A stable `X.Y.Z` version, which is all npm's `latest` can be here. */
const STABLE_VERSION = /^\d+\.\d+\.\d+$/

/** One issue to open: its exact title, and the body the workflow writes to it. */
export type RecheckIssue = { title: string; body: string }

/** The title a recheck issue carries for this Skill at this CLI release. */
export function recheckTitle(row: ManifestRow, latest: string): string {
	return `Recheck skill ${row.name}: traj ${latest} has passed its CLI Range ${row.cliRange}`
}

/**
 * True when `latest` is at or past the range's upper bound. A `<` bound is reached at its version; a
 * `<=` bound is reached only by going past it. A range with no upper bound is never passed.
 */
export function hasPassedCeiling(range: string, latest: string): boolean {
	const ceiling = cliRangeCeiling(range)
	if (ceiling === null) return false
	const order = Bun.semver.order(latest, ceiling.version)
	return ceiling.inclusive ? order > 0 : order >= 0
}

/**
 * The recheck issues to open: one for each row `latest` has passed, minus every row whose title is
 * already the title of an open issue.
 */
export function recheckIssues(
	rows: readonly ManifestRow[],
	latest: string,
	openTitles: readonly string[],
): RecheckIssue[] {
	if (!STABLE_VERSION.test(latest)) {
		throw new Error(`latest is not a stable X.Y.Z version: "${latest}"`)
	}
	const open = new Set(openTitles)
	return rows
		.filter((row) => hasPassedCeiling(row.cliRange, latest))
		.map((row) => ({ title: recheckTitle(row, latest), body: recheckBody(row, latest) }))
		.filter((issue) => !open.has(issue.title))
}

/** The issue body: what passed, where the range is authored, and what the recheck means. */
function recheckBody(row: ManifestRow, latest: string): string {
	return [
		`npm's \`latest\` for \`@trajectonomics/cli\` is ${latest}. The Skill \`${row.name}\` declares the CLI Range \`${row.cliRange}\` in \`skills/customer/skills.manifest.json\`.`,
		"",
		"The upper bound is a recheck marker, not a compatibility claim ([ADR 0004](https://github.com/trajectonomics/trajectonomics/blob/main/skills/customer/docs/adr/0004-the-cli-range-ceiling-is-a-recheck-marker.md)).",
		"Check the Skill against `traj schema` for this release. Then either update the Skill and raise the range in the manifest, or record that it still holds.",
		"",
		"Opened by the CLI Range ceiling check. It opens no second issue while one with this title is open.",
	].join("\n")
}

if (import.meta.main) {
	const [latestFlag, latest, openFlag, openPath] = process.argv.slice(2)
	if (
		latestFlag !== "--latest" ||
		latest === undefined ||
		openFlag !== "--open" ||
		openPath === undefined
	) {
		throw new Error(
			"usage: bun scripts/cli-range-ceiling.ts --latest <version> --open <titles file>",
		)
	}
	const manifest = parseSkillManifest(
		readFileSync(new URL(`../${MANIFEST_PATH}`, import.meta.url), "utf8"),
	)
	const openTitles = readFileSync(openPath, "utf8").split(/\r?\n/).filter(Boolean)
	for (const issue of recheckIssues(manifest.skills, latest, openTitles)) {
		console.log(JSON.stringify(issue))
	}
}
