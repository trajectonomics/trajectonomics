import type { Read, Snapshot } from "../../contract"
import { type NetWorthView, netWorthView } from "../net-worth/view"
import { type FiView, fiView } from "./fi"
import { type HealthView, healthView } from "./health"
import { mapRead } from "./map-read"
import { monthEndValues } from "./net-worth-history"
import { type PnlView, pnlView } from "./pnl"
import { type ProjectionView, projectionView } from "./projection"
import { mapScenario, primaryScenario, type ScenarioView, scenarioView } from "./scenario"
import { type TaxView, taxView } from "./tax"

/** The net worth card: the net worth view, and the month-end values its sparkline draws. */
export interface NetWorthCardView extends NetWorthView {
	readonly sparkline: readonly number[]
}

/** Every card on the Overview. Each Read keeps its own error, so one failed card shows alone. */
export interface OverviewView {
	readonly netWorth: Read<NetWorthCardView>
	readonly assets: Read<NetWorthView>
	readonly fi: ScenarioView<FiView>
	readonly projection: ScenarioView<ProjectionView | null>
	readonly tax: ScenarioView<TaxView>
	readonly pnl: Read<PnlView>
	readonly health: Read<HealthView>
}

/** The Overview's view of a Snapshot: every card's figures, derived from its Reads. */
export function overviewView(snapshot: Snapshot): OverviewView {
	const scenario = primaryScenario(snapshot.params)
	const history = snapshot.reads.netWorthHistory
	const netWorth = mapRead(snapshot.reads.netWorth, netWorthView)
	const projections = scenarioView(scenario, snapshot.reads.projections)
	return {
		netWorth: mapRead(snapshot.reads.netWorth, (data) => ({
			...netWorthView(data),
			sparkline: monthEndValues(history),
		})),
		assets: netWorth,
		fi: mapScenario(scenarioView(scenario, snapshot.reads.fi), fiView),
		projection: mapScenario(projections, projectionView),
		tax: mapScenario(projections, taxView),
		pnl: mapRead(snapshot.reads.pnl, pnlView),
		health: mapRead(snapshot.reads.doctor, healthView),
	}
}
