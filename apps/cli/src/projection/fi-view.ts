import { z } from "zod"
import type { PersonAge } from "../scenario/household/ages"
import { carryInField } from "./carryin-view"
import { FI_METHOD } from "./fi-method"
import { dateField } from "./money"
import { personAges } from "./person-ages"
import {
	type BestCaseView,
	bestCase,
	type RuleOfThumbView,
	ruleOfThumb,
	SURVIVAL_BINDINGS,
	type SurvivalBinding,
} from "./reference-view"
import { type TaxYearView, taxYearsField } from "./tax-view"
import {
	asOfField,
	type Echo,
	engineEcho,
	notesField,
	overrideFields,
	scenarioEcho,
	taxField,
} from "./view"

export type {
	BestCaseView,
	RuleOfThumbView,
	SurvivalBinding,
} from "./reference-view"
export type { TaxYearView } from "./tax-view"

/** The survival answer, in the engine's own three shapes (ADR-0008). */
export type FiAnswer =
	| { reachable: true; fiDate: string; reference: RuleOfThumbView }
	| { reachable: false; binding: "noCandidateMonth" }
	| { reachable: false; binding: SurvivalBinding; bestCase: BestCaseView }

/** The `fi` leaf's answer: the survival answer, with each person's age on a reachable date. */
export type FiLeafAnswer =
	| (Extract<FiAnswer, { reachable: true }> & { ages: PersonAge[] })
	| Extract<FiAnswer, { reachable: false }>

/** `traj fi`: the survival answer plus the echo block (ADR-0030). */
export type FiView = Echo & {
	horizon: string
	currency: string
	method: "survival"
	definition: { method: "survival"; definitionVersion: number; explanation: string }
	fi: FiLeafAnswer
	taxYears: TaxYearView[]
}

const reachableAnswer = z.strictObject({
	reachable: z.literal(true),
	fiDate: dateField("The earliest month earned income could stop"),
	reference: ruleOfThumb.describe("The rule-of-thumb reference beside the date; it never decides."),
})
const noCandidateAnswer = z.strictObject({
	reachable: z.literal(false),
	binding: z
		.literal("noCandidateMonth")
		.describe("The horizon leaves no month a stop could start from."),
})
const unreachableAnswer = z.strictObject({
	reachable: z.literal(false),
	binding: z.enum(SURVIVAL_BINDINGS).describe("The constraint that keeps FI out of reach."),
	bestCase: bestCase.describe("The best month the engine found, and why it fails."),
})

export const fiAnswer: z.ZodType<FiAnswer> = z.union([
	reachableAnswer,
	noCandidateAnswer,
	unreachableAnswer,
])

/** The `fi` leaf's answer: a reachable date also states each person's age on that date (ADR-0048). */
export const fiLeafAnswer: z.ZodType<FiLeafAnswer> = z.union([
	reachableAnswer.extend({
		ages: personAges.describe(
			"Each household person's age on fiDate, in household order; empty without a household.",
		),
	}),
	noCandidateAnswer,
	unreachableAnswer,
])

export const fiView: z.ZodType<FiView> = z.strictObject({
	asOf: asOfField,
	engine: engineEcho,
	scenario: scenarioEcho,
	...overrideFields,
	tax: taxField,
	carryIn: carryInField,
	notes: notesField,
	horizon: dateField("The date the Projection ends at"),
	currency: z.string().describe("The Scenario's ISO 4217 currency; v1 is THB only."),
	method: z.literal("survival").describe("The FI method, as the engine states it."),
	definition: z.strictObject({
		method: z
			.literal("survival")
			.describe("The FI method: survival, the earliest month earned income could stop."),
		definitionVersion: z.number().int().describe("The engine's version of that definition."),
		explanation: z.string().describe(`What the method does, in three sentences: ${FI_METHOD}`),
	}),
	fi: fiLeafAnswer,
	taxYears: taxYearsField.describe(
		"One entry per Levy settlement period, for the path the FI answer describes: earned income as the Scenario states it before fiDate and stopped from fiDate on, so a period after fiDate owes tax on what remains. When FI is unreachable there is no such path, so the entries describe the plan as written, with earned income running to the horizon, and a note says so. Empty when the Scenario holds no Levy.",
	),
})
