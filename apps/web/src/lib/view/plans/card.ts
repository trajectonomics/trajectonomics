import type { LineMarker, LineSeries } from "../../chart"
import type { Fi, ProjectionChance, ProjectionRun, Read, Snapshot } from "../../contract"
import { formatMonth, formatShare } from "../../format"
import { agesText } from "../household/model"
import { type PersonNames, snapshotItemNames } from "../item-names"
import type { ReachedMilestone } from "../milestones/milestones"
import { projectionView } from "../overview/projection"
import { type PlanChart, planChart } from "./chart"
import { type NotesPreview, notesPreview } from "./notes"
import type { Range } from "./range"
import { type PlanRow, planRows } from "./rows"

/** The FI answer of a card: the month and the ages on it, or that the plan does not reach it. */
export type CardFi =
	| { readonly reachable: true; readonly month: string; readonly ages: string | null }
	| { readonly reachable: false }

/** The chance of success of a card, when the Snapshot holds the read. */
export interface CardChance {
	readonly share: string
	readonly paths: number
}

/** Net worth at the end of the plan's run, as the CLI states it. */
export interface CardNetWorth {
	readonly amount: string
	readonly currency: string
	readonly endDate: string
}

/** One plan side by side with the others: its facts, each only when the Snapshot holds the read. */
export interface PlanCard {
	readonly row: PlanRow
	readonly notes: NotesPreview | null
	readonly fi: CardFi | null
	readonly chance: CardChance | null
	readonly netWorth: CardNetWorth | null
	readonly series: readonly LineSeries[]
	readonly markers: readonly LineMarker[]
	/** The Milestones the chart draws a rule for, in date order, so the card can name each in words. */
	readonly milestones: readonly ReachedMilestone[]
	/** The CLI's message when the plan's projection could not be read; null otherwise. */
	readonly problem: string | null
}

/** The ages a reachable FI answer states: "age 54", or each person's when the household has several. */
function agesOf(
	ages: Extract<Fi["fi"], { reachable: true }>["ages"],
	people: PersonNames,
): string | null {
	if (ages.length === 0) return null
	const [only] = ages
	if (ages.length === 1 && only !== undefined) return `age ${only.age}`
	return agesText(ages, people)
}

function fiOf(read: Read<Fi> | undefined, people: PersonNames): CardFi | null {
	if (read === undefined || !read.ok) return null
	const result = read.data.fi
	if (!result.reachable) return { reachable: false }
	return { reachable: true, month: formatMonth(result.fiDate), ages: agesOf(result.ages, people) }
}

function chanceOf(read: Read<ProjectionChance> | undefined): CardChance | null {
	if (read === undefined || !read.ok) return null
	return { share: formatShare(read.data.successBps), paths: read.data.paths }
}

function netWorthOf(run: ProjectionRun): CardNetWorth | null {
	const view = projectionView(run)
	return view === null
		? null
		: { amount: view.nominal, currency: view.currency, endDate: view.endDate }
}

/** The card of one projected plan over a range. Everything on it is a Read the Snapshot holds, shown as it stands. */
export function planCard(snapshot: Snapshot, row: PlanRow, range: Range): PlanCard {
	const { reads } = snapshot
	const shown = reads.documents[row.name]
	const run = reads.projections[row.name]
	const names = snapshotItemNames(snapshot, row.name)
	const chart: PlanChart | null = run?.ok ? planChart(run.data, range, names) : null
	return {
		row,
		notes: notesPreview(shown?.ok ? shown.data.scenario.notes : null),
		fi: fiOf(reads.fi[row.name], names.people),
		chance: chanceOf(reads.chance[row.name]),
		netWorth: run?.ok ? netWorthOf(run.data) : null,
		series: chart?.series ?? [],
		markers: chart?.markers ?? [],
		milestones: chart?.milestones ?? [],
		problem: run !== undefined && !run.ok ? run.error.message : null,
	}
}

/** The cards of the plans this dashboard projects: the main plan first, then by name. */
export function planCards(snapshot: Snapshot, range: Range): PlanCard[] {
	return planRows(snapshot)
		.filter((row) => row.projected)
		.map((row) => planCard(snapshot, row, range))
}

/** The plans the ledger holds that this dashboard does not project, in the same order. */
export function notProjected(snapshot: Snapshot): PlanRow[] {
	return planRows(snapshot).filter((row) => !row.projected)
}
