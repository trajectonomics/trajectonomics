import type { ProjectionRun, ScenarioDocument } from "../../contract"
import { formatCompact, formatDate, yearOf } from "../../format"
import { milestoneRowsOf } from "../milestones/milestones"

/** One Milestone as a compact card on the Plan: when the CLI reaches it, and what states it. */
export interface MilestoneCardView {
	readonly id: string
	/** The date the CLI reached it, as the page prints a date; null when the plan does not reach it. */
	readonly date: string | null
	/** The year the plan runs out, for one it does not reach; null when the CLI states no run-out. */
	readonly notReachedBy: string | null
	/** "On a date" or "When net worth reaches 10M"; "" when the card has no words for the Milestone's terms. */
	readonly how: string
}

/** One Milestone as the plan's document states it: its id, and the terms it fires on. */
interface StatedMilestone {
	readonly id: string
	readonly criteria: readonly unknown[]
}

/** The engine's metrics in the plan's words, for the ones this page reads. */
const METRICS: Readonly<Record<string, string>> = {
	netWorth: "net worth",
	accessibleNetWorth: "the net worth you can reach",
	allAssets: "everything you own",
	unlockedAssets: "the assets you can reach",
	liabilities: "what you owe",
}

/** The Milestones the document states, in its order. */
function statedIn(doc: ScenarioDocument | null): readonly StatedMilestone[] {
	return (doc?.milestones ?? []).flatMap((entry) => {
		if (typeof entry !== "object" || entry === null) return []
		const record = entry as Record<string, unknown>
		const id = record["id"]
		if (typeof id !== "string") return []
		const criteria = Array.isArray(record["criteria"]) ? record["criteria"] : []
		return [{ id, criteria }]
	})
}

/** What one criterion fires on, in the plan's words: "On a date", "When net worth reaches 10M". */
function criterionWords(criterion: unknown): string {
	if (typeof criterion !== "object" || criterion === null) return ""
	const record = criterion as Record<string, unknown>
	if (record["kind"] === "date") return "On a date"
	if (record["kind"] !== "metric") return ""
	const metric = METRICS[String(record["metric"] ?? "")]
	const amount = record["amount"]
	if (metric === undefined || typeof amount !== "string") return ""
	const compact = formatCompact(amount)
	return record["op"] === "atMost"
		? `When ${metric} is at most ${compact}`
		: `When ${metric} reaches ${compact}`
}

/** A Milestone's terms in words, or "" for one the page has none for: several criteria, or one it does not know. */
function howOf(criteria: readonly unknown[]): string {
	return criteria.length === 1 ? criterionWords(criteria[0]) : ""
}

/** The id of a Milestone the run states, matched to the document's terms. */
function howById(stated: readonly StatedMilestone[], id: string): string {
	return howOf(stated.find((milestone) => milestone.id === id)?.criteria ?? [])
}

/**
 * The plan's Milestones as compact cards, in the order the run states them (the document's own, without a run).
 * A Milestone the run does not reach shows the year the plan runs out.
 */
export function milestoneCards(
	doc: ScenarioDocument | null,
	run: ProjectionRun | undefined,
): MilestoneCardView[] {
	const stated = statedIn(doc)
	const rows = run === undefined ? null : milestoneRowsOf(run)
	if (rows === null) {
		return stated.map((milestone) => ({
			id: milestone.id,
			date: null,
			notReachedBy: null,
			how: howOf(milestone.criteria),
		}))
	}
	const runOut = run === undefined ? null : (run.runsOut?.date ?? run.horizon)
	return rows.map((row) => ({
		id: row.id,
		date: row.date === null ? null : formatDate(row.date),
		notReachedBy: row.date === null && runOut !== null ? yearOf(runOut) : null,
		how: howById(stated, row.id),
	}))
}
