import { formatDate } from "../../format"
import type { ChartKind, Pt } from "./types"

/** One line to draw: its name, how it is dashed, and the CLI's figures it is drawn from. */
export interface Drawn {
	readonly name: string
	readonly dashed: boolean
	readonly dotted: boolean
	readonly points: readonly Pt[]
}

const STACKED_NOTE = "A stacked chart draws one set of terms, so it is nominal."
const STACKED_MIXED_NOTE =
	"A stacked chart draws one set of terms, and a series here has no figure in today's money from traj, so it is nominal."
const NOMINAL_NOTE = "Series marked nominal have no figure in today's money from traj."
const PART_YEAR_NOTE = "A faded column is a part year."

/** The day a line's periods end each year, such as "30 Oct": from its first full period, or its first. */
function endDay(line: Drawn): string | null {
	const point = line.points.find((item) => item.period?.partial !== true) ?? line.points[0]
	return point ? formatDate(point.date).replace(/ \d+$/, "") : null
}

/** A sentence naming which series end on which day, when the series of a column chart do not all end on one. */
function periodNote(lines: readonly Drawn[]): string | null {
	const byDay = new Map<string, string[]>()
	for (const line of lines) {
		const day = endDay(line)
		if (day !== null) byDay.set(day, [...(byDay.get(day) ?? []), line.name])
	}
	if (byDay.size < 2) return null
	const parts = [...byDay].map(
		([day, names]) => `${names.join(", ")} end${names.length === 1 ? "s" : ""} each ${day}`,
	)
	return `These series cover different periods, so each sits in its own column: ${parts.join("; ")}.`
}

/** The notes under a chart: the terms it draws, and what its periods are. */
export function chartNotes(input: {
	kind: ChartKind
	lines: readonly Drawn[]
	/** The terms asked for, when a stacked chart had to draw nominal instead. */
	stackedNominal: "real" | "both" | null
	nominalLabelled: boolean
}): string[] {
	const columns = input.kind !== "line"
	const part = columns && input.lines.some((line) => line.points.some((p) => p.period?.partial))
	return [
		...(input.stackedNominal === "both" ? [STACKED_NOTE] : []),
		...(input.stackedNominal === "real" ? [STACKED_MIXED_NOTE] : []),
		...(input.nominalLabelled ? [NOMINAL_NOTE] : []),
		...(columns ? [periodNote(input.lines)] : []).flatMap((note) => (note ? [note] : [])),
		...(part ? [PART_YEAR_NOTE] : []),
	]
}
