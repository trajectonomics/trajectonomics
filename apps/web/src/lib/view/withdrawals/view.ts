import type { ProjectionChance, ProjectionRun } from "../../contract"
import { type BandsView, bandsOf, type ChanceLine, chanceLineOf } from "./bands"
import { type RuleYears, ruleYearsOf } from "./years"

/** What the Withdrawals page shows of one run and one chance read: the Rule years, and the Bands. */
export interface WithdrawalsView {
	readonly rules: readonly RuleYears[]
	/** The chance of success; null when the Snapshot states no Return model (no chance read). */
	readonly chance: ChanceLine | null
	/** What the rule pays across the Market paths; null when there is no chance read or the plan has no rule. */
	readonly bands: BandsView | null
	readonly currency: string
}

/** The page's view of a run and its chance read (either may be absent); pure, every figure the CLI's. */
export function withdrawalsView(
	run: ProjectionRun | null,
	chance: ProjectionChance | null,
): WithdrawalsView {
	return {
		rules: run === null ? [] : ruleYearsOf(run),
		chance: chance === null ? null : chanceLineOf(chance),
		bands: chance === null ? null : bandsOf(chance),
		currency: run?.currency ?? chance?.currency ?? "",
	}
}
