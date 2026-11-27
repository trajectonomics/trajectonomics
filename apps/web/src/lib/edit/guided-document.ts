/**
 * The document a guided plan starts from: the CLI's decimal template at the Snapshot's As-of, with the person's
 * answers applied in order ([web ADR 0031](../../../docs/adr/0031-a-guided-first-plan-is-one-edit-that-saves-a-plan-and-its-household.md)).
 * Pure: the template text and the Edit in, the document or the refusal out. The page computes no figure and no date.
 */
import type { ErrorBody } from "../contract"
import { type ScenarioDocument, type ScenarioFlow, scenarioDocument } from "../contract"
import type { GuidedEdit, GuidedRows } from "./guided-edit"
import { endedAt, spending, stopWork } from "./guided-flows"
import { LEDGER_CHANGED, NO_FLOW, TEMPLATE_MISMATCH } from "./guided-refusals"

/** What the builder came to: the decimal document to apply, or the refusal that stops it. */
export type GuidedDocument =
	| { readonly ok: true; readonly document: ScenarioDocument }
	| { readonly ok: false; readonly error: ErrorBody }

const refused = (error: ErrorBody): GuidedDocument => ({ ok: false, error })

/** The template parsed as the decimal document the contract states, or null when it is not one. */
function parsedTemplate(text: string): ScenarioDocument | null {
	try {
		const parsed = scenarioDocument.safeParse(JSON.parse(text))
		return parsed.success ? parsed.data : null
	} catch {
		return null
	}
}

/** One Flow with the row's answers applied: its typed amount, and for income whether it is earned. */
function answered(flow: ScenarioFlow, row: GuidedRows[number]): ScenarioFlow {
	const amount = row.amount === undefined ? {} : { amount: row.amount }
	return flow.kind === "income"
		? { ...flow, ...amount, earned: row.earned ?? true }
		: { ...flow, ...amount }
}

/**
 * The Flows from the history answers: every template income or expense Flow must have one row and every row a Flow,
 * a row left unkept takes its Flow out, and a typed amount replaces the stated one. Null on a mismatch.
 */
function fromHistory(flows: readonly ScenarioFlow[], rows: GuidedRows): ScenarioFlow[] | null {
	const ids = new Set(rows.map((row) => row.id))
	const carried = flows.filter(spending)
	if (rows.length !== carried.length || carried.length !== ids.size) return null
	if (!carried.every((flow) => ids.has(flow.id))) return null
	const kept = new Map(rows.filter((row) => row.keep).map((row) => [row.id, row]))
	const out: ScenarioFlow[] = []
	for (const flow of flows) {
		const row = kept.get(flow.id)
		if (row !== undefined) out.push(answered(flow, row))
		else if (!spending(flow)) out.push(flow)
	}
	return out
}

/** The totals answers of one guided plan. */
type Totals = Extract<GuidedEdit["money"], { from: "totals" }>

/** The Flows from the totals answers: the template's `salary` and `spending` take the two typed totals. */
function fromTotals(flows: readonly ScenarioFlow[], money: Totals): ScenarioFlow[] | null {
	const salary = flows.find((flow) => flow.id === "salary" && flow.kind === "income")
	const spend = flows.find((flow) => flow.id === "spending" && flow.kind === "expense")
	if (salary === undefined || spend === undefined) return null
	return flows.map((flow) => {
		if (flow === salary) return { ...flow, amount: money.income }
		return flow === spend ? { ...flow, amount: money.spending } : flow
	})
}

/** The document one guided plan applies, or the refusal that stops it. */
export function guidedDocument(template: string, edit: GuidedEdit): GuidedDocument {
	const parsed = parsedTemplate(template)
	if (parsed === null) return refused(TEMPLATE_MISMATCH)
	const flows =
		edit.money.from === "history"
			? fromHistory(parsed.flows, edit.money.rows)
			: fromTotals(parsed.flows, edit.money)
	// A history mismatch is the ledger moving; the totals path has no rows, so only the template can be wrong.
	if (flows === null)
		return refused(edit.money.from === "history" ? LEDGER_CHANGED : TEMPLATE_MISMATCH)
	if (!flows.some(spending)) return refused(NO_FLOW)
	return {
		ok: true,
		document: {
			...parsed,
			flows: flows.map(endedAt),
			milestones: [...(parsed.milestones ?? []), stopWork(edit.asOf)],
		},
	}
}
