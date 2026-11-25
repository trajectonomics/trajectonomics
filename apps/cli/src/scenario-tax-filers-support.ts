import { projectionHome } from "./projection/testing"
import type { Household } from "./scenario/household/model"
import { setHousehold } from "./scenario-household-support"
import { COUPLE_LABELS, SAVINGS } from "./scenario-tax-filers-plan"
import { applyScenario, scenario } from "./scenario-test-support"
import type { Captured } from "./test-support"

export * from "./scenario-tax-filers-plan"

/** The projection fixture's data directory with `base` replaced by this plan, and its household when one is given. */
export async function couple(
	document: Record<string, unknown>,
	household: Household | null,
): Promise<string> {
	const home = await projectionHome()
	const applied = await applyScenario(home, "base", document)
	if (applied.code !== 0) throw new Error(applied.err)
	if (household !== null) {
		const set = await setHousehold(home, household)
		if (set.code !== 0) throw new Error(set.err)
	}
	return home
}

/** `traj scenario tax base --tax th-2026 --filing-status <status>` with the couple's labels. */
export function taxCouple(
	home: string,
	status: string,
	labels: readonly string[] = COUPLE_LABELS,
	extra: readonly string[] = [],
): Promise<Captured> {
	return scenario(home, [
		"tax",
		"base",
		"--tax",
		"th-2026",
		"--filing-status",
		status,
		...labels,
		...extra,
	])
}

/** The stored document of `base`, with the interest of its savings Account labelled for tax. */
async function withInterestLabel(home: string): Promise<Record<string, unknown>> {
	const shown = await scenario(home, ["show", "base"])
	const { document } = JSON.parse(shown.out).scenario as { document: Record<string, unknown> }
	const accounts = document["accounts"] as Record<string, unknown>[]
	return {
		...document,
		accounts: accounts.map((account) =>
			account["id"] === SAVINGS
				? { ...account, returnLabel: "income.section40_4.interest" }
				: account,
		),
	}
}

/**
 * The savings Account's interest labelled for tax, then the Levy written again from the stored
 * profile: an Account's label needs a Levy to exist, so it comes second (cli ADR-0075).
 */
export async function labelSavings(home: string): Promise<Captured> {
	const applied = await applyScenario(home, "base", await withInterestLabel(home))
	if (applied.code !== 0) return applied
	return scenario(home, ["tax", "base", "--from-stored"])
}
