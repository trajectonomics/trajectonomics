import type { Inflation } from "../money/inflation"
import type { DateString, Flow, RuleAction, RuledAmount, Scenario } from "../types"
import { isRuled } from "../types"
import { isSafeInteger } from "./overflow"
import { currentYear, type Fixed, guardrailsYear, initialYear, type YearInput } from "./rule-year"

/** One Rule year as the run keeps it: its fixed amount `Y` and what its Occurrences paid so far. */
export interface RuleYear {
	readonly date: DateString
	readonly portfolio: bigint
	readonly amount: bigint
	paid: bigint
	readonly action: RuleAction
}

/** What one Occurrence of a rule Flow planned, on the Landed date it fell on. */
export interface RulePay {
	readonly date: DateString
	readonly amount: bigint
}

/**
 * One rule Flow's progress: the Occurrences it has landed and the Rule years they began. `pays`
 * lists every Occurrence in order, and exists only in a book opened to record them (chance of success).
 */
export interface FlowRule {
	count: number
	readonly years: RuleYear[]
	readonly pays?: RulePay[]
}

/** The state a run carries for its rule Flows (ADR 0023); `undefined` for a Scenario without one. */
export type RuleBook = Map<string, FlowRule>

export type RuledFlow = Flow & RuledAmount

/** One Occurrence of a rule Flow: its Landed date and the whole years since the Flow's `start`. */
export interface RuleOccurrence {
	readonly flow: RuledFlow
	readonly date: DateString
	readonly years: number
}

/** A Flow's Occurrences per Rule year: twelve for a monthly Flow, one for an annual one. */
export function perYear(flow: Flow): number {
	return flow.frequency === "monthly" ? 12 : 1
}

/** An empty book, or `undefined` when the Scenario declares no rule Flow; `record` also logs each payment. */
export function openRules(scenario: Scenario, record = false): RuleBook | undefined {
	const book: RuleBook = new Map()
	for (const flow of scenario.flows) {
		if (isRuled(flow)) book.set(flow.id, { count: 0, years: [], ...(record && { pays: [] }) })
	}
	return book.size === 0 ? undefined : book
}

/** A copy a candidate can continue without touching the walk it came from. */
export function cloneRules(book: RuleBook | undefined): RuleBook | undefined {
	if (book === undefined) return undefined
	const copy: RuleBook = new Map()
	for (const [id, state] of book) {
		const years = state.years.map((year) => ({ ...year }))
		copy.set(id, { count: state.count, years, ...(state.pays && { pays: [...state.pays] }) })
	}
	return copy
}

function fix(flow: RuledFlow, input: YearInput): Fixed {
	const { rule } = flow
	if (rule.kind === "currentRate") return currentYear(rule, input)
	return rule.kind === "guardrails" ? guardrailsYear(rule, input) : initialYear(rule, input)
}

/** The Account reader and inflation a Rule year is fixed with. */
export interface RuleReads {
	readonly inflation: Inflation
	readonly readAccount: (accountId: string) => bigint
}

/** Begins a Rule year on `occurrence`: reads the portfolio and fixes the year's amount. */
function begin(state: FlowRule, occurrence: RuleOccurrence, reads: RuleReads): boolean {
	const { flow, date, years } = occurrence
	let portfolio = 0n
	for (const id of flow.rule.portfolio) portfolio += reads.readAccount(id)
	const first = state.years[0]?.amount ?? 0n
	const previous = state.years[state.years.length - 1]?.amount ?? 0n
	const { inflation } = reads
	const index = state.years.length
	const fixed = fix(flow, { date, years, inflation, portfolio, index, first, previous })
	if (!isSafeInteger(portfolio) || !isSafeInteger(fixed.amount)) return false
	state.years.push({ date, portfolio, amount: fixed.amount, paid: 0n, action: fixed.action })
	return true
}

/**
 * What one Occurrence of a rule Flow pays, advancing the book: the first Occurrence of each Rule year
 * reads the portfolio and fixes the year's amount `Y`. The k-th Occurrence of a monthly year pays
 * `floor(Y × k / 12) − floor(Y × (k − 1) / 12)`, so twelve add to `Y` exactly; an annual one pays `Y`.
 * `undefined` when the portfolio or the amount is not a safe integer.
 */
export function ruleAmount(
	book: RuleBook,
	occurrence: RuleOccurrence,
	reads: RuleReads,
): bigint | undefined {
	const state = book.get(occurrence.flow.id)
	if (state === undefined) return 0n
	const per = perYear(occurrence.flow)
	const position = state.count % per
	if (position === 0 && !begin(state, occurrence, reads)) return undefined
	const year = state.years[state.years.length - 1]!
	const part = BigInt(position + 1)
	const pay =
		per === 1 ? year.amount : (year.amount * part) / 12n - (year.amount * (part - 1n)) / 12n
	state.count++
	year.paid += pay
	state.pays?.push({ date: occurrence.date, amount: pay })
	return pay
}
