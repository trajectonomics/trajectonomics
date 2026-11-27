import type { ChanceMilestone, ChanceOfSuccess } from "@trajectonomics/core/sim"
import { daysInMonth } from "../calendar"
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

/**
 * The last day of the month a month-start date names. An age lands on the last day of a birth
 * month (cli ADR-0048), and an annual row states its ages on its `to` date, so the ages a Milestone
 * date carries are those on the end of its reported month.
 */
function monthLastDay(date: string): string {
	const day = String(daysInMonth(Number(date.slice(0, 4)), Number(date.slice(5, 7))))
	return `${date.slice(0, 8)}${day.padStart(2, "0")}`
}

/** One fire-date Percentile with the household's ages on its month's last day; absent levels are null. */
function datesOf(milestone: ChanceMilestone, placed: Placed): MilestoneDatesView | null {
	if (milestone.reached === 0) return null
	const dates = new Map(milestone.dates.map((entry) => [entry.level, entry.date]))
	const at = (level: number): MilestoneDateView | null => {
		const date = dates.get(level)
		return date === undefined ? null : { date, ages: agesOn(placed.household, monthLastDay(date)) }
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
