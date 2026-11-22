import { z } from "zod"
import type { DocumentSpec, RequiredDocumentField, Result } from "../../command"
import { ok } from "../../command"
import { type AppError, isAppError } from "../../errors"
import type { HouseholdSet } from "../../store"
import { scenarioNotFound } from "../errors"
import {
	type HouseholdDocument,
	householdOf,
	view,
	type WrittenScenario,
	writtenWithHousehold,
} from "../view"
import { householdDocument } from "./document"
import type { AnchoredDate } from "./place"

/** The input field the household is written to: a Scenario by its name or id. */
export const REQUIRED_SCENARIO: RequiredDocumentField = {
	field: "scenario",
	sentence: "name the Scenario the household belongs to",
}

/** The household document, which `--none` removes instead (cli ADR-0048). */
export const HOUSEHOLD: DocumentSpec<typeof householdDocument> = {
	flag: "file",
	schema: householdDocument,
	allowed: ["scenario", "dryRun", "ifHash"],
	required: [REQUIRED_SCENARIO],
	hint: 'Run "traj scenario household <name> --none" with no --file to remove the household.',
}

const anchoredDate: z.ZodType<AnchoredDate> = z.strictObject({
	path: z.string().describe("The anchored dotted path, such as flows.salary.end."),
	value: z.string().describe("The date written there, as YYYY-MM-DD."),
})

export const householdOutput: z.ZodType<HouseholdResult> = z.strictObject({
	dryRun: z.boolean().describe("True when the write was rolled back."),
	status: z
		.enum(["updated", "unchanged"])
		.describe("Whether the household or a date it pins changed."),
	scenario: writtenWithHousehold,
	anchored: z
		.array(anchoredDate)
		.describe("The dates the household wrote into the Scenario; empty after --none."),
})

export type HouseholdResult = {
	dryRun: boolean
	status: "updated" | "unchanged"
	scenario: WrittenScenario & { household: HouseholdDocument }
	anchored: AnchoredDate[]
}

/** The result of a household write, or the refusal that stopped it. */
export function reply(
	outcome: HouseholdSet | AppError,
	name: string,
	anchored: AnchoredDate[],
	dryRun: boolean,
): Result<HouseholdResult> | AppError {
	if (isAppError(outcome)) return outcome
	if (outcome.status === "not_found") return scenarioNotFound(name)
	const rendered = view(outcome.scenario)
	const scenario = { ...rendered, household: householdOf(outcome.scenario) }
	return ok({ dryRun, status: outcome.status, scenario, anchored })
}
