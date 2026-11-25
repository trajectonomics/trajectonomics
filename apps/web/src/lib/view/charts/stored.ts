import { z } from "zod"
import { CHART_KINDS, type ChartDef, MAX_CHARTS, MAX_NAME, MAX_SERIES } from "./types"

/** The localStorage key of the charts. The value is one JSON document, `FORMAT`, version `VERSION`. */
export const CHARTS_KEY = "traj.charts"
/** Where text under `CHARTS_KEY` that could not be read is kept, before a save would replace it. */
export const UNREAD_KEY = "traj.charts.unread"
export const FORMAT = "trajectonomics-charts"
export const VERSION = 1

const chart = z.strictObject({
	id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),
	name: z.string().trim().min(1).max(MAX_NAME),
	kind: z.enum(CHART_KINDS),
	series: z
		.array(z.string().min(1).max(300))
		.min(1)
		.max(MAX_SERIES)
		.refine((ids) => new Set(ids).size === ids.length, "a series is listed once"),
})

const chartFile = z.strictObject({
	format: z.literal(FORMAT),
	version: z.number(),
	charts: z.array(chart).max(MAX_CHARTS),
})

/** The outcome of reading a chart document. A refusal is a sentence the page shows. */
export type Parsed =
	| { readonly ok: true; readonly charts: readonly ChartDef[] }
	| { readonly ok: false; readonly reason: string }

/** The document's text: what is stored, and the file a person exports. Pretty-printed so a file is readable. */
export function serializeCharts(charts: readonly ChartDef[]): string {
	return JSON.stringify({ format: FORMAT, version: VERSION, charts }, null, 2)
}

/** Reads a chart document from text: strictly, so a file that is not one is refused whole and names why. */
export function parseCharts(text: string): Parsed {
	let value: unknown
	try {
		value = JSON.parse(text)
	} catch {
		return { ok: false, reason: "This is not a chart file: it is not JSON." }
	}
	const later = laterVersion(value)
	if (later !== null) return { ok: false, reason: later }
	const found = chartFile.safeParse(value)
	if (!found.success) {
		const first = found.error.issues[0]
		return {
			ok: false,
			reason: `This is not a chart file: ${first?.path.join(".") || "the document"} is not valid.`,
		}
	}
	if (found.data.version !== VERSION)
		return { ok: false, reason: versionSentence(found.data.version) }
	return { ok: true, charts: found.data.charts }
}

function versionSentence(version: number): string {
	return `This chart file is version ${version}; this page reads version ${VERSION}.`
}

/** The sentence for a chart document of another version, said before its shape is checked, since a newer version may have another shape. */
function laterVersion(value: unknown): string | null {
	if (typeof value !== "object" || value === null) return null
	const { format, version } = value as { format?: unknown; version?: unknown }
	return format === FORMAT && typeof version === "number" && version !== VERSION
		? versionSentence(version)
		: null
}

/** What storage holds: no value is no charts; a value that cannot be read is no charts, with the reason to tell the person. */
export function readCharts(stored: string | null): {
	readonly charts: readonly ChartDef[]
	readonly problem: string | null
} {
	if (stored === null) return { charts: [], problem: null }
	const parsed = parseCharts(stored)
	return parsed.ok
		? { charts: parsed.charts, problem: null }
		: {
				charts: [],
				problem: `The charts saved in this browser could not be read. ${parsed.reason}`,
			}
}
