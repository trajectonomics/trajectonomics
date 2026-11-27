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
import type { AnchoredDate, FollowedDate } from "./place"

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

const followedDate: z.ZodType<FollowedDate> = z.strictObject({
	path: z
		.string()
		.describe("The employer's share's dotted path, such as flows.salary-employer.end."),
	value: z.string().describe("The date written there, as YYYY-MM-DD."),
	follows: z
		.string()
		.describe("The anchored path whose date it follows, such as flows.salary.end."),
})

export const householdOutput: z.ZodType<HouseholdResult> = z.strictObject({
	dryRun: z.boolean().describe("True when the write was rolled back."),
	status: z
		.enum(["updated", "unchanged"])
		.describe("Whether the household or a date it pins changed."),
	scenario: writtenWithHousehold,
	anchored: z
		.array(anchoredDate)
		.describe("The anchored dates the household wrote; empty after --none."),
	followed: z
		.array(followedDate)
		.optional()
		.describe(
			"The dates the household also wrote into an employer's share, because its derive reads an anchored Flow's gross (cli ADR-0048); absent when none moved.",
		),
})

export type HouseholdResult = {
	dryRun: boolean
	status: "updated" | "unchanged"
	scenario: WrittenScenario & { household: HouseholdDocument }
	anchored: AnchoredDate[]
	followed?: FollowedDate[] | undefined
}

/** The result of a household write, or the refusal that stopped it. */
export function reply(
	outcome: HouseholdSet | AppError,
	name: string,
	anchored: AnchoredDate[],
	followed: FollowedDate[],
	dryRun: boolean,
): Result<HouseholdResult> | AppError {
	if (isAppError(outcome)) return outcome
	if (outcome.status === "not_found") return scenarioNotFound(name)
	const rendered = view(outcome.scenario)
	const household = householdOf(outcome.scenario)
	if (isAppError(household)) return household
	const scenario = { ...rendered, household }
	return ok({
		dryRun,
		status: outcome.status,
		scenario,
		anchored,
		...(followed.length === 0 ? {} : { followed }),
	})
}
