/**
 * The words of a closed vocabulary the CLI states in `traj schema`, against the words a web list holds
 * (web ADR 0001, amendment 2026-11-25). Pure: the test that spawns `traj` hands the parsed schema in.
 */

/** How a web list must follow the CLI's: `same` for a contract enum the pages branch on, `within` for a list a form offers. */
export type Follow = "same" | "within"

/** The words at a path of a parsed schema (`a.b.c` names `a` then `b` then `c`), or null when the path is gone or not a list of words. */
export function wordsAt(schema: unknown, path: string): string[] | null {
	let node: unknown = schema
	for (const key of path.split(".")) {
		if (typeof node !== "object" || node === null) return null
		node = (node as Record<string, unknown>)[key]
	}
	if (!Array.isArray(node)) return null
	return node.every((word) => typeof word === "string") ? (node as string[]) : null
}

/**
 * The problems of one web list against the CLI's: a word the CLI added and the web has not followed (for `same`),
 * and a word the web offers that the CLI no longer lists (for both). Empty when the list follows.
 */
export function vocabularyProblems(
	label: string,
	web: readonly string[],
	cli: readonly string[],
	follow: Follow,
): string[] {
	const problems: string[] = []
	const added = cli.filter((word) => !web.includes(word))
	const gone = web.filter((word) => !cli.includes(word))
	if (follow === "same" && added.length > 0) {
		problems.push(
			`${label}: the CLI lists ${added.map((w) => `"${w}"`).join(", ")} and the web contract does not. A page that branches on it would break: add the word to the contract, or read the field as a plain string if the page only shows it.`,
		)
	}
	if (gone.length > 0) {
		problems.push(
			`${label}: the web lists ${gone.map((w) => `"${w}"`).join(", ")} and the CLI does not.`,
		)
	}
	return problems
}
