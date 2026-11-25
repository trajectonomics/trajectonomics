import type { ProjectionRunView } from "./projection/run-view"
import { projection } from "./projection/testing"
import { runBody } from "./projection-run-support"
import { ownLevy } from "./scenario-tax-separate-plan"
import { applyScenario, resultOf, scenario } from "./scenario-test-support"

/* The readers and writes the tests of the separate Return share (cli ADR-0075). */

export * from "./scenario-tax-separate-plan"

type Rows = Record<string, unknown>[]

/** The stored document of `base`. */
export async function documentOf(home: string): Promise<Record<string, unknown>> {
	const shown = resultOf(await scenario(home, ["show", "base"])).scenario
	return shown.document as Record<string, unknown>
}

/** A Flow of a document, by id. */
export function flowOf(document: Record<string, unknown>, id: string): Record<string, unknown> {
	return (document["flows"] as Rows).find((flow) => flow["id"] === id)!
}

/**
 * Applies the stored document with each named Flow's fields laid over it, beside the caller's own
 * Levies: how a Prepayment reaches a plan that is already taxed.
 */
export async function amend(
	home: string,
	flows: Record<string, object>,
	levies: readonly string[] = [],
): Promise<void> {
	const before = await documentOf(home)
	const applied = await applyScenario(home, "base", {
		...before,
		flows: (before["flows"] as Rows).map((flow) => ({ ...flow, ...flows[String(flow["id"])] })),
		// A tax write puts its own Levies last, so the caller's go first and only the write's changes show.
		levies: [...levies.map(ownLevy), ...(before["levies"] as Rows)],
	})
	if (applied.code !== 0) throw new Error(applied.err)
}

/** `traj scenario tax base --merge --filing-status <status>`, which must succeed. */
export async function refile(home: string, status: string): Promise<void> {
	const res = await scenario(home, ["tax", "base", "--merge", "--filing-status", status])
	if (res.code !== 0) throw new Error(res.err)
}

/** The 2026 tax year of each Levy of `base`. */
export async function year2026(home: string): Promise<ProjectionRunView["taxYears"]> {
	const run = runBody(
		await projection(home, [
			"run",
			"--scenario",
			"base",
			"--as-of",
			"2026-01-01",
			"--horizon",
			"2027-12-31",
		]),
	)
	return run.taxYears.filter((it) => it.from === "2026-01-01")
}
