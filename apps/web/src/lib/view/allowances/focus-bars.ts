import { toChartNumber } from "../../chart"
import type { ItemLabel } from "../item-names"
import type { YearView } from "./years"

/** One allowance's bar: its share of the widest bar, and the part this plan takes and the part it could. */
export interface AllowanceBar {
	readonly key: string
	readonly name: string
	/** The bar's width, as a share of the widest planned plus extra among every bar, from 0 to 1. */
	readonly width: number
	/** The filled and outlined parts, shares of this bar's own room, from 0 to 1. */
	readonly taken: number
	readonly left: number
}

/** One Return's bars and the saving it states for the tax year the As-of falls in. */
export interface AllowanceGroup {
	readonly key: string
	/** The Filer in the household's words; null for a plan's one Return, which names no one. */
	readonly name: ItemLabel | string | null
	readonly saving: string
	readonly bars: readonly AllowanceBar[]
}

/** A line's room: the planned and extra amounts together, a chart number for drawing only (web ADR 0002). */
function roomOf(line: YearView["lines"][number]): number {
	return toChartNumber(line.planned) + toChartNumber(line.extra)
}

/** The widest room among a year's lines, against which every bar of the focus point is scaled. */
export function largestRoomOf(years: readonly YearView[]): number {
	return Math.max(0, ...years.flatMap((year) => year.lines.filter((line) => !line.ssf).map(roomOf)))
}

/** One Return's bars: every allowance with room, its filled and outlined parts, against the widest bar. */
export function barsOf(year: YearView, largest: number): AllowanceBar[] {
	return year.lines
		.filter((line) => !line.ssf)
		.flatMap((line) => {
			const room = roomOf(line)
			if (room <= 0) return []
			return [
				{
					key: line.key,
					name: line.name,
					width: room / largest,
					taken: toChartNumber(line.planned) / room,
					left: toChartNumber(line.extra) / room,
				},
			]
		})
}
