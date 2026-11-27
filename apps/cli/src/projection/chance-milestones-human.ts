import { isRecord } from "../table/lines"

/*
 * `projection chance --milestone-dates`' human lines: one per Milestone, in Scenario order, saying how
 * many futures reached it and the median and 10-90 per cent fire dates with the household's ages.
 */

const MONTHS = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
] as const

/** A month-start date as a person reads it, such as `Jun 2041`; an unreadable date is shown as it is. */
function monthYear(date: unknown): string {
	if (typeof date !== "string") return ""
	const month = Number(date.slice(5, 7))
	const word = MONTHS[month - 1]
	return word === undefined ? date : `${word} ${date.slice(0, 4)}`
}

/** `age 52` for one person, `me 52, partner 50` for several; nothing without a household. */
function agesText(ages: unknown): string {
	if (!Array.isArray(ages)) return ""
	const people = ages.filter(isRecord)
	if (people.length === 0) return ""
	if (people.length === 1) return ` (age ${String(people[0]?.["age"])})`
	return ` (${people.map((entry) => `${String(entry["person"])} ${String(entry["age"])}`).join(", ")})`
}

/** The date and age of one Percentile, such as `Jun 2041 (age 52)`. */
function dateText(entry: unknown): string {
	if (!isRecord(entry)) return "unknown"
	return `${monthYear(entry["date"])}${agesText(entry["ages"])}`
}

/** The Percentile entry at one level, from the dates object. */
function level(dates: unknown, key: string): unknown {
	return isRecord(dates) ? dates[key] : undefined
}

/** One Milestone's line: how many reached it, the median and the 10 to 90 per cent range. */
function milestoneLine(milestone: Record<string, unknown>, total: number): string {
	const label =
		typeof milestone["displayLabel"] === "string"
			? milestone["displayLabel"]
			: String(milestone["id"])
	const reached = isRecord(milestone["reached"]) ? milestone["reached"]["paths"] : 0
	const paths = typeof reached === "number" ? reached : 0
	if (paths === 0) return `${label}: never reached in ${total} futures`
	const dates = milestone["dates"]
	const medianEntry = level(dates, "p50")
	const median = dateText(medianEntry)
	const low = dateText(level(dates, "p10"))
	const high = dateText(level(dates, "p90"))
	if (isRecord(medianEntry) && low === median && median === high) {
		return `${label}: reached in ${paths} of ${total} futures; ${median}`
	}
	return `${label}: reached in ${paths} of ${total} futures; median ${median}, 10-90%: ${low} to ${high}`
}

/** The Milestone lines the human form prints after the Bands, or none without the flag. */
export function milestoneBlocks(data: Record<string, unknown>): string[] {
	const milestones = data["milestones"]
	if (!Array.isArray(milestones) || milestones.length === 0) return []
	const total = typeof data["paths"] === "number" ? data["paths"] : 0
	return [
		milestones
			.filter(isRecord)
			.map((entry) => milestoneLine(entry, total))
			.join("\n"),
	]
}
