import type { Snapshot } from "../../contract"
import { DEMO } from "../what-if/fixtures.test-support"

/** What a test says of each plan the ledger holds: the Demo's two, and any more it names. */
export type PlanFacts = { main?: boolean; notes?: string }

/**
 * The Demo snapshot as a ledger with these plans would state it: `scenario list` marks the main plan and the plans with
 * notes, `scenario show` carries the notes, and `projected` names the plans the dashboard was started with. A plan the
 * Demo does not hold is listed without reads, as a plan outside the `--scenario` list is.
 */
export function ledgerWith(
	facts: Readonly<Record<string, PlanFacts>>,
	projected: readonly string[] = ["base", "retire-early"],
): Snapshot {
	const snapshot = structuredClone(DEMO)
	const list = snapshot.reads.scenarios
	if (!list.ok) throw new Error("the Demo lacks its plan list")
	const known = list.data.scenarios
	const template = known[0]
	if (template === undefined) throw new Error("the Demo holds no plan")
	list.data.scenarios = Object.keys(facts).map((name, index) => ({
		...(known.find((plan) => plan.name === name) ?? {
			...template,
			id: `id-${name}`,
			name,
			contentHash: `jcs1:sha256:${String(index).repeat(64)}`,
		}),
		main: facts[name]?.main === true,
		hasNotes: facts[name]?.notes !== undefined,
	}))
	for (const [name, read] of Object.entries(snapshot.reads.documents)) {
		const notes = facts[name]?.notes
		if (read.ok && notes !== undefined) read.data.scenario.notes = notes
	}
	// The main plan leads, as the Snapshot states its plans (web ADR 0023).
	const main = projected.find((name) => facts[name]?.main === true)
	snapshot.params.scenarios =
		main === undefined ? [...projected] : [main, ...projected.filter((name) => name !== main)]
	return snapshot
}
