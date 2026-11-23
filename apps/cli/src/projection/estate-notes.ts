import type { Scenario } from "@trajectonomics/core/sim"

/**
 * The sentence `--estate` adds when the Scenario states no settlement cost (cli ADR-0064): each row's
 * net is then the gross estate less the debts, which a reader could take for what heirs would really
 * keep. A cost is the caller's own, so the note names where one is written and says what `traj` leaves out.
 */
export function estateNotes(document: Scenario, estate: boolean): string[] {
	if (!estate || (document.estate?.costs?.length ?? 0) > 0) return []
	return [
		"The Scenario states no settlement cost, so each estate row's net is the gross estate less the debts. A cost is your own figure, written under estate.costs as a share of the estate or a fixed amount: traj ships none and does not work out Thai inheritance tax, so add it as a cost line if it applies.",
	]
}
