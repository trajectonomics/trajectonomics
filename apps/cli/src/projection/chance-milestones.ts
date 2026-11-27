import type { ChanceMilestone, ChanceOfSuccess } from "@trajectonomics/core/sim"
import { agesOn } from "../scenario/household/ages"
import type { Placed } from "./carryin-apply"
import {
	type ChanceMilestoneView,
	type MilestoneDatesView,
	type MilestoneDateView,
	milestoneDatesLevels,
} from "./chance-milestones-view"
import { shareBpsOf, shareText } from "./chance-share"

/** A Milestone's label from its Scenario entry, or null when the plan gives it none. */
function labelsOf(placed: Placed): Map<string, string | null> {
	return new Map(
		(placed.document.milestones ?? []).map((entry) => [entry.id, entry.displayLabel ?? null]),
	)
}

/** One fire-date Percentile with the household's ages on it; absent levels are null. */
function datesOf(milestone: ChanceMilestone, placed: Placed): MilestoneDatesView | null {
	if (milestone.reached === 0) return null
	const dates = new Map(milestone.dates.map((entry) => [entry.level, entry.date]))
	const at = (level: number): MilestoneDateView | null => {
		const date = dates.get(level)
		return date === undefined ? null : { date, ages: agesOn(placed.household, date) }
	}
	return Object.fromEntries(
		milestoneDatesLevels.map((level) => [`p${level}`, at(level)]),
	) as MilestoneDatesView
}

/** The engine's Milestone reports as this result states them, keeping the Scenario's order. */
export function milestonesOf(chance: ChanceOfSuccess, placed: Placed): ChanceMilestoneView[] {
	const labels = labelsOf(placed)
	return (chance.milestones ?? []).map((milestone) => ({
		id: milestone.id,
		displayLabel: labels.get(milestone.id) ?? null,
		reached: {
			paths: milestone.reached,
			share: shareText(shareBpsOf(milestone.reached, chance.paths)),
		},
		dates: datesOf(milestone, placed),
		byYear: milestone.byYear.map((entry) => ({ year: entry.year, paths: entry.paths })),
	}))
}
