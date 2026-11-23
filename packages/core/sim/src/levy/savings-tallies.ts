import type { Levy, MinorUnits, Tallies, TallyBasis } from "../types"
import type { LevyMeasureValue } from "../types/projection"

/** The `funded` labels some `tally` Measure of the Levy reads. */
export function fundedLabels(levy: Levy): ReadonlySet<string> {
	const labels = new Set<string>()
	for (const measure of levy.measures) {
		if (measure.op === "tally" && measure.basis === "funded") labels.add(measure.label)
	}
	return labels
}

/** The `tally` Measure values a period reported, rebuilt as the Tallies the engine evaluated. */
export function talliesOfPeriod(levy: Levy, measures: readonly LevyMeasureValue[]): Tallies {
	const reported = new Map(measures.map((item) => [item.id, item.value] as const))
	const maps: Record<TallyBasis, Map<string, MinorUnits>> = {
		gross: new Map(),
		funded: new Map(),
		returns: new Map(),
		gains: new Map(),
	}
	for (const measure of levy.measures) {
		if (measure.op !== "tally") continue
		maps[measure.basis].set(measure.label, reported.get(measure.id) ?? 0)
	}
	return maps
}

/** The same Tallies with one `funded` label set to `value`. */
export function withFunded(tallies: Tallies, label: string, value: MinorUnits): Tallies {
	return { ...tallies, funded: new Map(tallies.funded).set(label, value) }
}
