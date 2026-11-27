import type { ProjectionRun, ScenarioDocument } from "../../contract"
import { formatDate, yearOf } from "../../format"
import { milestoneRowsOf } from "../milestones/milestones"

/** What a Milestone fires on, split so its amount is drawn as money and Hide amounts masks it. */
export interface MilestoneTerms {
	/** The words before the amount: "On a date", or "When net worth reaches"; "" when the page has none. */
	readonly words: string
	/** The amount the terms name, as the CLI states it; null when the words name none. */
	readonly amount: string | null
}

/** One Milestone as a compact card on the Plan: when the CLI reaches it, and what states it. */
export interface MilestoneCardView {
	readonly id: string
	/** The date the CLI reached it, as the page prints a date; null when the plan does not reach it. */
	readonly date: string | null
	/** The year the plan runs out, for one it does not reach; null when the CLI states no run-out. */
	readonly notReachedBy: string | null
	/** The Milestone's terms, in the plan's words and its own amount; empty words when the card has none. */
	readonly terms: MilestoneTerms
}

/** One Milestone as the plan's document states it: its id, and the terms it fires on. */
interface StatedMilestone {
	readonly id: string
	readonly criteria: readonly unknown[]
}
/** The terms of a Milestone the page has no words for. */
const NO_TERMS: MilestoneTerms = { words: "", amount: null }
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

/** What one criterion fires on, in the plan's words and its amount: "On a date", "When net worth reaches". */
function criterionTerms(criterion: unknown): MilestoneTerms {
	if (typeof criterion !== "object" || criterion === null) return NO_TERMS
	const record = criterion as Record<string, unknown>
	if (record["kind"] === "date") return { words: "On a date", amount: null }
	if (record["kind"] !== "metric") return NO_TERMS
	const metric = METRICS[String(record["metric"] ?? "")]
	const amount = record["amount"]
	if (metric === undefined || typeof amount !== "string") return NO_TERMS
	return {
		words: record["op"] === "atMost" ? `When ${metric} is at most` : `When ${metric} reaches`,
		amount,
	}
}

/** A Milestone's terms in words, or none for one the page has none for: several criteria, or one it does not know. */
function termsOf(criteria: readonly unknown[]): MilestoneTerms {
	return criteria.length === 1 ? criterionTerms(criteria[0]) : NO_TERMS
}

/** The terms of a Milestone the run states, matched to the document's own. */
function termsById(stated: readonly StatedMilestone[], id: string): MilestoneTerms {
	return termsOf(stated.find((milestone) => milestone.id === id)?.criteria ?? [])
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
			terms: termsOf(milestone.criteria),
		}))
	}
	const runOut = run === undefined ? null : (run.runsOut?.date ?? run.horizon)
	return rows.map((row) => ({
		id: row.id,
		date: row.date === null ? null : formatDate(row.date),
		notReachedBy: row.date === null && runOut !== null ? yearOf(runOut) : null,
		terms: termsById(stated, row.id),
	}))
}
