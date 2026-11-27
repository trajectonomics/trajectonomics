import { z } from "zod"
import type { Leaf } from "../../command"
import { defineCommand } from "../../command"
import { missingFieldError } from "../../document"
import { fail, isAppError } from "../../errors"
import { scenarioNotFound } from "../../scenario/errors"
import { HOUSEHOLD, householdOutput, REQUIRED_SCENARIO, reply } from "../../scenario/household/form"
import { canonicalHousehold, type Household } from "../../scenario/household/model"
import {
	type AnchoredDate,
	type FollowedDate,
	placeHousehold,
} from "../../scenario/household/place"
import { IF_HASH } from "../../scenario/if-hash"
import { LEDGER_READ_CODES } from "../../store"
import { withStore } from "../../with-store"

export const household: Leaf = defineCommand({
	name: "household",
	summary:
		"Set the people whose ages pin a Scenario's dates and who owns its items, or remove them",
	note: "The household ships in 0.8.0, and so do --if-hash and the owners of a version 2 household.",
	positionals: ["scenario"],
	input: z.strictObject({
		scenario: z.string().min(1).optional().describe("The Scenario's exact name or its id."),
		file: z
			.string()
			.min(1)
			.optional()
			.describe("The household JSON document's path, or - for stdin."),
		none: z
			.boolean()
			.optional()
			.describe("Remove the household; the dates it anchored stay as they are."),
		dryRun: z.boolean().optional().describe("Report the row and roll the write back."),
		ifHash: IF_HASH,
	}),
	document: HOUSEHOLD,
	output: householdOutput,
	examples: [
		{
			command: "traj scenario household base --file household.json",
			description:
				"Set the people and owners of base, a version 2 household; the dates their ages pin are written into it. Each owner names a person id or shared.",
		},
		{
			command: "traj scenario household base --file household.json --dry-run",
			description: "Show the dates the household would write, and roll the write back.",
		},
		{
			command: "traj scenario household base --none",
			description: "Remove the household; the dates it anchored stay as they are.",
		},
		{
			command:
				"traj scenario household base --none --if-hash jcs1:sha256:27da7c42cb1c3811b4562b605e8e62a0e1d6470ef9a04269311fa52a4fc9450c",
			description:
				"Remove the household only if base still holds the householdHash the household wrote.",
		},
	],
	errorCodes: [
		"database_busy",
		"invalid_input",
		"not_found",
		"scenario_changed",
		...LEDGER_READ_CODES,
	],
	run: (input, document, ctx) => {
		// Without --file the document is absent, so --none must be the form the caller means.
		const incoming: Household | undefined = document
		if (incoming === undefined && input.none !== true) {
			return fail("invalid_input", {
				path: "file",
				message: "file: name a household document, - for stdin, or --none",
				hint: 'Run "traj scenario household <name> --none" to remove the household.',
			})
		}
		const name = input.scenario
		if (name === undefined) return missingFieldError(REQUIRED_SCENARIO)
		const dryRun = input.dryRun === true
		return withStore(ctx, (store) => {
			const row = store.getScenario(name)
			if (isAppError(row)) return row
			if (row === null) return scenarioNotFound(name)
			let anchored: AnchoredDate[] = []
			let followed: FollowedDate[] = []
			const outcome = store.replaceHousehold(
				row.id,
				(current) => {
					if (incoming === undefined) return { document: current, household: null }
					const placed = placeHousehold(incoming, current)
					if (isAppError(placed)) return placed
					anchored = placed.anchored
					followed = placed.followed
					return { document: placed.document, household: canonicalHousehold(incoming) }
				},
				{ dryRun, expectedHash: input.ifHash },
			)
			return isAppError(outcome) ? outcome : reply(outcome, name, anchored, followed, dryRun)
		})
	},
})
