/** The read leaves the Plan may emit. A write leaf is never on this list: `leaves.test.ts` pins it. */
export const READ_LEAVES = [
	"doctor",
	"account list",
	"balance",
	"report networth",
	"report pnl",
	"tx list",
	"baseline show",
	"scenario list",
	"scenario show",
	"projection run",
	"fi",
	"projection compare",
	"projection chance",
	"projection path",
	"projection allowances",
] as const

/** One of the read leaves the Plan may emit. */
export type ReadLeaf = (typeof READ_LEAVES)[number]

/** The read leaf an argv starts with, or null when it starts with none. */
export function leafOf(argv: readonly string[]): ReadLeaf | null {
	return (
		READ_LEAVES.find((leaf) => leaf.split(" ").every((word, index) => argv[index] === word)) ?? null
	)
}
