import type { ProjectionRun } from "../../contract"
import { formatDate } from "../../format"

/** The fields every projection-shaped result states at its root: the echo a figure is checked against. */
export type ProjectionShape = Pick<
	ProjectionRun,
	"asOf" | "engine" | "scenario" | "overrides" | "tax" | "notes" | "horizon" | "currency"
>

/** A content hash shown in twelve characters, with the full hash kept for the reader who wants it. */
export interface HashView {
	readonly label: string
	readonly short: string
	readonly full: string
}

/** One applied Override. `sensitive` marks a value that may be money, so hide-amounts masks it. */
export interface OverrideView {
	readonly path: string
	readonly display: string
	readonly sensitive: boolean
}

/** What a result says about itself, in the words a reader checks it with. */
export interface Statement {
	readonly tax: string
	readonly asOf: string
	readonly horizon: string
	readonly engine: string
	readonly scenario: string
	readonly hashes: readonly HashView[]
	readonly overrides: readonly OverrideView[]
	readonly notes: readonly string[]
}

const TAX_LABELS: Record<ProjectionShape["tax"], string> = {
	applied: "Tax applied",
	mixed: "Tax mixed across the two sides",
	not_applied: "Tax not applied",
}

const HASH_LENGTH = 12

/** The statement of a result: its tax status, dates, engine, Scenario, hashes, Overrides and notes. */
export function statementOf(shape: ProjectionShape): Statement {
	return {
		tax: TAX_LABELS[shape.tax],
		asOf: formatDate(shape.asOf),
		horizon: formatDate(shape.horizon),
		engine: `${shape.engine.package} ${shape.engine.version}`,
		scenario: shape.scenario.name,
		hashes: [
			{
				label: "Content hash",
				short: shortHash(shape.scenario.contentHash),
				full: shape.scenario.contentHash,
			},
			{
				label: "Effective hash, after Overrides",
				short: shortHash(shape.scenario.effectiveContentHash),
				full: shape.scenario.effectiveContentHash,
			},
		],
		overrides: shape.overrides.map((override) => overrideView(override.path, override.value)),
		notes: shape.notes,
	}
}

/** The digest of a hash such as "jcs1:sha256:…", in its first twelve characters. */
export function shortHash(hash: string): string {
	const digest = hash.slice(hash.lastIndexOf(":") + 1)
	return digest.slice(0, HASH_LENGTH)
}

const DIGITS = /\d/

function overrideView(path: string, value: unknown): OverrideView {
	return {
		path,
		display: JSON.stringify(value) ?? "null",
		sensitive: isSensitive(value),
	}
}

/** A boolean, or text with no digit in it, cannot be money. Anything else may be, so it is masked. */
function isSensitive(value: unknown): boolean {
	if (typeof value === "boolean") return false
	if (typeof value === "string") return DIGITS.test(value)
	return true
}
