/**
 * The read leaves the Plan may emit: each one writes nothing. `leaves.test.ts` pins the list.
 */
export const READ_LEAVES = [
	"doctor",
	"account list",
	"balance",
	"report networth",
	"report pnl",
	"tx list",
	"baseline show",
	"baseline rates",
	"scenario list",
	"scenario show",
	"projection run",
	"fi",
	"projection compare",
	"projection chance",
	"projection path",
	"projection allowances",
] as const

/**
 * The writes the Plan emits only as a dry run. A dry run runs the real write inside its `IMMEDIATE`
 * transaction and rolls it back (cli ADR 0019), so it stores nothing even though it takes the writer lock.
 */
export const DRY_RUN_LEAVES = ["scenario tax"] as const

/** One of the read leaves the Plan may emit. */
export type ReadLeaf = (typeof READ_LEAVES)[number]

/** One of the dry-run leaves the Plan may emit. It writes unless the argv says `--dry-run`. */
export type DryRunLeaf = (typeof DRY_RUN_LEAVES)[number]

/** The read leaf an argv starts with, or a dry-run leaf when it says `--dry-run` before any `--`. */
export function leafOf(argv: readonly string[]): ReadLeaf | DryRunLeaf | null {
	const starts = (leaf: string): boolean =>
		leaf.split(" ").every((word, index) => argv[index] === word)
	const read = READ_LEAVES.find(starts)
	if (read !== undefined) return read
	const end = argv.indexOf("--")
	const flags = end < 0 ? argv : argv.slice(0, end)
	const dryRun = DRY_RUN_LEAVES.find(starts)
	return dryRun !== undefined && flags.includes("--dry-run") ? dryRun : null
}
