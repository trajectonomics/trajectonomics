// Shapes one scratch plan's routing for the row check (#829): two withdrawal entries, and three surplus steps, so the
// first row shown after an unsaved reorder can be removed without leaving a last step that does not take everything.
import { writeFile } from "node:fs/promises"
import { join } from "node:path"

/** Runs one `traj` read or write the scratch ledger must take, or stops with its message. */
type Run = (argv: string[]) => Promise<unknown>

/** A third liquid asset of the plan alone, so the last surplus step takes everything and the middle one can go. */
const RESERVE = "reserve"

/** One plan's document as `scenario show` states it: integer minor units and integer basis points. */
type Document = {
	readonly accounts?: readonly { readonly id: string }[]
	readonly cashflow?: {
		readonly withdraw?: readonly unknown[]
		readonly surplus?: readonly unknown[]
		readonly [key: string]: unknown
	}
	readonly [key: string]: unknown
}

export async function shapeRoutingPlan(run: Run, scratch: string, name: string): Promise<void> {
	const shown = (await run(["scenario", "show", name])) as {
		scenario: { document: Document }
	}
	const { document } = shown.scenario
	const [bank, fund] = document.cashflow?.withdraw ?? []
	if (typeof bank !== "string" || typeof fund !== "string")
		throw new Error(`The ${name} plan takes from two accounts`)
	const cashflow = {
		...document.cashflow,
		surplus: [
			{ account: bank, share: 5000 },
			{ account: fund, upTo: 10_000_000 },
			{ account: RESERVE },
		],
	}
	const accounts = [...(document.accounts ?? []), { id: RESERVE, kind: "asset", rate: 0 }]
	const file = join(scratch, `${name}.json`)
	await writeFile(file, JSON.stringify({ ...document, accounts, cashflow }))
	await run(["scenario", "apply", name, "--file", file])
}
