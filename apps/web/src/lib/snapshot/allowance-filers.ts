/**
 * The Filers a plan's Returns are over, so a `projection allowances` read can name each Return's own labels
 * (cli ADR-0075). The projection states a separate filing's Filers in each `taxYears[].filer`; a joint Return
 * keeps one Levy, so its Filers come from that Levy's own tallies. Pure.
 */
import type { ProjectionRun, ScenarioDocument } from "../contract"
import { bareLabelOf } from "../edit/tax-labels"
import type { PlannedRead } from "./planned"

/** The Filer a suffixed tax label names; null for a bare label and for the household's `@shared`. */
function filerOfLabel(label: string): string | null {
	const bare = bareLabelOf(label)
	if (bare === label) return null
	const filer = label.slice(bare.length + 1)
	return filer === "" || filer === "shared" ? null : filer
}

/** The labels a plan's Levies tally: the Returns' own classes, which name each Filer (cli ADR-0075). */
function levyLabels(plan: ScenarioDocument): string[] {
	return (plan.levies ?? []).flatMap((levy) => {
		const measures = (levy as { measures?: unknown }).measures
		if (!Array.isArray(measures)) return []
		return measures.flatMap((measure) => {
			if (measure === null || typeof measure !== "object") return []
			const { op, label } = measure as { op?: unknown; label?: unknown }
			return op === "tally" && typeof label === "string" ? [label] : []
		})
	})
}

/**
 * The Filers whose Returns the read names, in the CLI's order: the projection's own, then those the plan's
 * Levies tally, so a joint Return over Filers finds its spouses without one. Empty for a plan without Filers.
 */
export function filersOf(plan: ScenarioDocument, projection: ProjectionRun | undefined): string[] {
	const found: string[] = []
	const add = (filer: string | null): void => {
		if (filer !== null && !found.includes(filer)) found.push(filer)
	}
	for (const year of projection?.taxYears ?? []) add(year.filer ?? null)
	for (const label of levyLabels(plan)) add(filerOfLabel(label))
	return found
}

/** Each chosen label once per Filer, a Return's labels together and in the person's order. */
export function filerLabels(labels: readonly string[], filers: readonly string[]): string[] {
	return filers.flatMap((filer) => labels.map((label) => `${label}@${filer}`))
}

/** The read with each of its own labels suffixed by every Filer; unchanged when it names none. */
export function readForFilers(planned: PlannedRead, filers: readonly string[]): PlannedRead {
	const at = planned.argv.indexOf("--labels")
	const value = planned.argv[at + 1]
	if (at === -1 || value === undefined) return planned
	const argv = [...planned.argv]
	argv[at + 1] = filerLabels(value.split(","), filers).join(",")
	return { ...planned, argv }
}
