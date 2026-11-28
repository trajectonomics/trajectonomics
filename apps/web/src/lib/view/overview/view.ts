import type { Read, Snapshot } from "../../contract"
import { accountNames } from "../account-names"
import { type AllowancesSummary, allowancesSummaryOf } from "../allowances/home"
import { type ChanceSummary, chanceSummaryOf } from "../chance/page"
import { type EstateSummary, estateSummaryOf } from "../estate/home"
import { NO_PEOPLE, snapshotPeople } from "../item-names"
import { type NetWorthView, netWorthView } from "../net-worth/view"
import { claimsHolderOf } from "../tax-settings/holders"
import { type WithdrawalsSummary, withdrawalsSummaryOf } from "../withdrawals/home"
import { mapRead } from "./map-read"
import { type ProjectionView, projectionView } from "./projection"
import { homePlan, mapScenario, type ScenarioView, scenarioView } from "./scenario"
import { type TaxView, taxView } from "./tax"

/** Every card on the Overview's summary. Each Read keeps its own error, so one failed card shows alone. */
export interface OverviewView {
	readonly netWorth: Read<NetWorthView>
	readonly projection: ScenarioView<ProjectionView | null>
	readonly chance: ScenarioView<ChanceSummary>
	/** Tax the current year could still save; shown only when it is above zero (null summary: not shown). */
	readonly allowances: ScenarioView<AllowancesSummary | null>
	/** What the plan's spending rule pays in its first year; shown only when the plan has one (null summary: not shown). */
	readonly withdrawals: ScenarioView<WithdrawalsSummary | null>
	/** What heirs would receive on the default date; shown whenever the run states an estate (null summary: not shown). */
	readonly estate: ScenarioView<EstateSummary | null>
	readonly tax: ScenarioView<TaxView>
}

/**
 * The Overview's summary of a Snapshot: every card's figures, derived from its Reads. The cards follow the plan
 * the address bar names (`requested`), and the main plan when it names none.
 */
export function overviewView(snapshot: Snapshot, requested = ""): OverviewView {
	const scenario = homePlan(snapshot, requested)
	const people =
		scenario === null ? NO_PEOPLE : (snapshotPeople(snapshot, [scenario])[scenario] ?? NO_PEOPLE)
	const projections = scenarioView(scenario, snapshot.reads.projections)
	const planned = scenario === null ? undefined : snapshot.reads.documents[scenario]
	const shown = planned?.ok ? planned.data.scenario : null
	const holder = claimsHolderOf(snapshot, scenario)
	const names = accountNames(snapshot.reads.accounts)
	return {
		netWorth: mapRead(snapshot.reads.netWorth, (data) => netWorthView(data, names)),
		projection: mapScenario(projections, projectionView),
		chance: mapScenario(scenarioView(scenario, snapshot.reads.chance), chanceSummaryOf),
		allowances: mapScenario(scenarioView(scenario, snapshot.reads.allowances), (data) =>
			allowancesSummaryOf(data, people, holder),
		),
		withdrawals: mapScenario(projections, withdrawalsSummaryOf),
		estate: mapScenario(projections, (run) =>
			estateSummaryOf(run, shown?.document ?? null, shown?.household ?? null),
		),
		tax: mapScenario(projections, taxView),
	}
}
