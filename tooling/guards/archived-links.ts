/** The repositories of the organisation that are archived: a link to one of them is stale. */
export const ARCHIVED_REPOS = [
	"cli",
	"docs",
	"site",
	"skills",
	"internal-skills",
	"ledger-core",
	"tax-core",
	"sim-core",
	"money",
	"design-system",
	"goals",
	"blog",
	"moojot",
] as const

/**
 * A reference to an archived repository: its GitHub URL, or its `owner/repo` name. An npm scope
 * (`@trajectonomics/cli`) and a path inside this repository (`trajectonomics/trajectonomics/...`)
 * are not references.
 */
export const ARCHIVED_REFERENCE: RegExp = new RegExp(
	`(?:github\\.com/|(?<![\\w@./-]))trajectonomics/(?:${ARCHIVED_REPOS.join("|")})(?![\\w-])`,
)

/** A tracked file's line that names an archived repository. */
export interface Hit {
	readonly path: string
	readonly line: number
	readonly text: string
}

/** A reviewed hit that stays: the file, a text the hit's line contains, and why it stays. */
export interface Allowance {
	readonly path: string
	readonly match: string
	readonly reason: string
}

/** Whether a tracked path is checked. Architecture decision records keep their history, and this folder names the repositories it guards. */
export function isChecked(path: string): boolean {
	return !/(^|\/)docs\/adr\//.test(path) && !path.startsWith("tooling/guards/")
}

/** The hits in one file's text, one per line that names an archived repository. */
export function hitsIn(path: string, text: string): Hit[] {
	const hits: Hit[] = []
	text.split("\n").forEach((line, index) => {
		if (line.search(ARCHIVED_REFERENCE) >= 0) {
			hits.push({ path, line: index + 1, text: line.trim() })
		}
	})
	return hits
}

/** Whether an allowance covers a hit: the same file, and a line that contains its match. */
export function isAllowed(hit: Hit, allowances: readonly Allowance[]): boolean {
	return allowances.some(
		(allowance) => allowance.path === hit.path && hit.text.includes(allowance.match),
	)
}
