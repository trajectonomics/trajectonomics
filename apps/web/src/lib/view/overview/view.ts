import type { Read, Snapshot } from "../../contract"
import { type AllowancesSummary, allowancesSummaryOf } from "../allowances/home"
import { type ChanceSummary, chanceSummaryOf } from "../chance/page"
import { type EstateSummary, estateSummaryOf } from "../estate/home"
import { NO_PEOPLE, snapshotPeople } from "../item-names"
import { type FeesOverPlan, feesOverPlan } from "../lifetime"
import { type NetWorthView, netWorthView } from "../net-worth/view"
import { claimsHolderOf } from "../tax-settings/holders"
import { baselineRun } from "../what-if/baseline"
import { type WithdrawalsSummary, withdrawalsSummaryOf } from "../withdrawals/home"
import { type FiView, fiView } from "./fi"
import { type HealthView, healthView } from "./health"
import { mapRead } from "./map-read"
import { monthEndValues } from "./net-worth-history"
import { type PnlView, pnlView } from "./pnl"
import { type ProjectionView, projectionView } from "./projection"
import { homePlan, mapScenario, type ScenarioView, scenarioView } from "./scenario"
import { type TaxView, taxView } from "./tax"

/** The net worth card: the net worth view, the month-end values its sparkline draws, and the plan's fees. */
export interface NetWorthCardView extends NetWorthView {
	readonly sparkline: readonly number[]
	/** The fees over the plan as the primary Scenario's run states them; null when it states none above zero. */
	readonly fees: FeesOverPlan | null
}

/** Every card on the Overview. Each Read keeps its own error, so one failed card shows alone. */
export interface OverviewView {
	readonly netWorth: Read<NetWorthCardView>
	readonly assets: Read<NetWorthView>
	readonly fi: ScenarioView<FiView>
	readonly projection: ScenarioView<ProjectionView | null>
	readonly chance: ScenarioView<ChanceSummary>
	/** Tax the current year could still save; shown only when it is above zero (null summary: not shown). */
	readonly allowances: ScenarioView<AllowancesSummary | null>
	/** What the plan's spending rule pays in its first year; shown only when the plan has one (null summary: not shown). */
	readonly withdrawals: ScenarioView<WithdrawalsSummary | null>
	/** What heirs would receive on the default date; shown whenever the run states an estate (null summary: not shown). */
	readonly estate: ScenarioView<EstateSummary | null>
	readonly tax: ScenarioView<TaxView>
	readonly pnl: Read<PnlView>
	readonly health: Read<HealthView>
}

/**
 * The Overview's view of a Snapshot: every card's figures, derived from its Reads. The cards follow the plan the
 * address bar names (`requested`), and the main plan when it names none.
 */
export function overviewView(snapshot: Snapshot, requested = ""): OverviewView {
	const scenario = homePlan(snapshot, requested)
	const people =
		scenario === null ? NO_PEOPLE : (snapshotPeople(snapshot, [scenario])[scenario] ?? NO_PEOPLE)
	const history = snapshot.reads.netWorthHistory
	const netWorth = mapRead(snapshot.reads.netWorth, netWorthView)
	const projections = scenarioView(scenario, snapshot.reads.projections)
	const planned = scenario === null ? undefined : snapshot.reads.documents[scenario]
	const shown = planned?.ok ? planned.data.scenario : null
	const holder = claimsHolderOf(snapshot, scenario)
	return {
		netWorth: mapRead(snapshot.reads.netWorth, (data) => ({
			...netWorthView(data),
			sparkline: monthEndValues(history),
			fees: scenario === null ? null : feesOverPlan(baselineRun(snapshot, scenario)),
		})),
		assets: netWorth,
		fi: mapScenario(scenarioView(scenario, snapshot.reads.fi), fiView),
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
		pnl: mapRead(snapshot.reads.pnl, pnlView),
		health: mapRead(snapshot.reads.doctor, healthView),
	}
}
