/** How a custom chart draws its series. */
export const CHART_KINDS = ["line", "bars", "stacked-line", "stacked-bars"] as const
export type ChartKind = (typeof CHART_KINDS)[number]

/** The plain name of each kind, for the picker and the chart's own label. */
export const KIND_LABELS: Readonly<Record<ChartKind, string>> = {
	line: "Line",
	bars: "Bars",
	"stacked-line": "Stacked line",
	"stacked-bars": "Stacked bars",
}

/** One chart the person made: a name, how it is drawn, and the ids of the series it plots. Not a plan, so it is in no Scenario. */
export interface ChartDef {
	readonly id: string
	readonly name: string
	readonly kind: ChartKind
	readonly series: readonly string[]
}

/** The most charts kept, and the most series in one chart. */
export const MAX_CHARTS = 50
export const MAX_SERIES = 8
export const MAX_NAME = 60

/** The groups the series picker lists, in order. */
export const GROUPS = [
	{ id: "net-worth", title: "Net worth" },
	{ id: "money", title: "Money in and out" },
	{ id: "tax", title: "Tax" },
	{ id: "retirement", title: "Retirement and estate" },
] as const
export type GroupId = (typeof GROUPS)[number]["id"]

/** The period a figure covers, as `traj` states it: its first day, and whether it is only part of a year. */
export interface Period {
	readonly from: string
	readonly partial: boolean
}

/** One value of a series: the day its period ends (counted, the place on the x axis), and the CLI's string. */
export interface Pt {
	readonly x: number
	/** The period's end date, as the axis prints it. */
	readonly label: string
	/** The period's end date, as text. */
	readonly date: string
	readonly amount: string
	/** The period it covers, or null for a figure `traj` states only for a day. */
	readonly period: Period | null
}

/** One series a run states: its id (the same on every plan), its name, and its figures nominal and, when `traj` states one, real. */
export interface Resolved {
	readonly id: string
	readonly name: string
	readonly group: GroupId
	readonly nominal: readonly Pt[]
	readonly real: readonly Pt[] | null
}
