/**
 * Saving a salary with what its employer adds (web ADR 0017): the salary and the employer's Flow are written in one document,
 * and kept in step, so the Flow takes the salary's frequency, start, end and gates each time the salary is saved.
 */
import type { ScenarioDocument, ScenarioFlow } from "../../contract/scenario-show"
import { upsert, without } from "./document"
import { type EmployerShare, employerIdOf, employerOf, employerTargets } from "./employer"
import {
	type EmployerDraft,
	employerIdTaken,
	employerInputOf,
	employerUsed,
} from "./employer-draft"
import { employerFlowOf } from "./employer-flow"
import { type FlowResult, flowFromDraft } from "./flow-draft"
import type { FlowDraft, FlowKind } from "./flows"
import type { Problems } from "./problems"

/** The outcome: the salary, the employer's Flow it carries (null for none), and the id of an employer Flow this save removes. */
export type SalaryResult =
	| { ok: true; flow: ScenarioFlow; employer: ScenarioFlow | null; dropped: string | null }
	| { ok: false; problems: Problems }

const EARNED_WORDS =
	"What your employer adds goes with earned income. Clear it, or keep this income earned."

/** What the employer section states over the salary just built, or the problems at its fields. */
function withEmployer(
	salary: ScenarioFlow,
	employerDraft: EmployerDraft,
	doc: ScenarioDocument,
	stored: EmployerShare | null,
): SalaryResult {
	const { input, problems } = employerInputOf(employerDraft, employerTargets(doc))
	if (Object.keys(problems).length > 0) return { ok: false, problems }
	const id = employerIdOf(salary.id)
	if (input === null) {
		return { ok: true, flow: salary, employer: null, dropped: stored === null ? null : id }
	}
	if (stored === null && doc.flows.some((flow) => flow.id === id)) {
		return { ok: false, problems: { employerAccount: employerIdTaken(salary.id) } }
	}
	const employer = employerFlowOf(salary, input, stored?.flow ?? null)
	if (employer === null) {
		return { ok: false, problems: { general: "What your employer adds cannot be saved as it is." } }
	}
	return { ok: true, flow: salary, employer, dropped: null }
}

/** The problems of the salary, of the employer section and of ticking earned off under an employer share, merged. */
function mergedProblems(
	salary: FlowResult,
	employer: SalaryResult | null,
	drafts: { draft: FlowDraft; employer: EmployerDraft },
): Problems {
	const employerProblems = employer?.ok === false ? employer.problems : {}
	const earned =
		!drafts.draft.earned && employerUsed(drafts.employer) ? { earned: EARNED_WORDS } : {}
	return { ...(salary.ok ? {} : salary.problems), ...employerProblems, ...earned }
}

/**
 * The salary a draft names with what its employer adds, or the problems of both at once, so one save shows every field that
 * needs a fix. The employer section is for income only; a salary that is not earned cannot carry one.
 */
export function salaryFromDraft(
	draft: FlowDraft,
	employerDraft: EmployerDraft,
	options: { kind: FlowKind; existing?: ScenarioFlow | undefined; doc: ScenarioDocument },
): SalaryResult {
	const { existing, doc, kind } = options
	const salary = flowFromDraft(draft, { kind, existing, taken: doc.flows.map((flow) => flow.id) })
	if (!salary.ok || kind !== "income") {
		return salary.ok ? { ok: true, flow: salary.flow, employer: null, dropped: null } : salary
	}
	const stored = existing === undefined ? null : employerOf(doc.flows, existing.id)
	const employer = withEmployer(salary.flow, employerDraft, doc, stored)
	const problems = mergedProblems(salary, employer, { draft, employer: employerDraft })
	return Object.keys(problems).length > 0 ? { ok: false, problems } : employer
}

/** The document with the salary put in, its employer Flow put in or taken out, and every other item as it was. */
export function withSalary(
	doc: ScenarioDocument,
	result: Extract<SalaryResult, { ok: true }>,
): ScenarioDocument {
	let flows = upsert(doc.flows, result.flow)
	if (result.employer !== null) flows = upsert(flows, result.employer)
	if (result.dropped !== null) flows = without(flows, result.dropped)
	return { ...doc, flows }
}

/** The document without the salary and the employer Flow it carries, when it carries one of the form's shape. */
export function withoutSalary(doc: ScenarioDocument, id: string): ScenarioDocument {
	const share: EmployerShare | null = employerOf(doc.flows, id)
	const gone = new Set([id, ...(share === null ? [] : [share.flow.id])])
	return { ...doc, flows: doc.flows.filter((flow) => !gone.has(flow.id)) }
}
