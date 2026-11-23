import { z } from "zod"
import type { Leaf } from "../../command"
import { defineCommand } from "../../command"
import { isAppError } from "../../errors"
import { readCarryIn } from "../../projection/carryin"
import { ageFlag, agesProblem, whatIfProblem } from "../../projection/compare-flags"
import { compared } from "../../projection/compare-prepare"
import { compareView } from "../../projection/compare-view"
import {
	asOfFlag,
	carryInFlag,
	carryInFlagDocument,
	horizonFlag,
	PROJECTION_ERROR_CODES,
	setFlag,
} from "../../projection/flags"
import { withProjection } from "../../projection/leaf"
import { compareHint } from "../../projection/render"
import { addFlag, decimalFlag, withoutFlag } from "../../scenario/override-flags"

export const compare: Leaf = defineCommand({
	name: "compare",
	summary: "Compare two Projections, or one against a what-if, and report the deltas",
	positionals: ["a", "b"],
	input: z.strictObject({
		asOf: asOfFlag,
		horizon: horizonFlag,
		set: setFlag,
		without: withoutFlag,
		add: addFlag,
		decimal: decimalFlag,
		carryIn: carryInFlag,
		a: z.string().describe("The first Scenario's exact name or its id."),
		b: z
			.string()
			.optional()
			.describe("The second Scenario's exact name or its id; omit it to use --set."),
		birthDate: z
			.string()
			.optional()
			.describe("The birth date the ages count from, as YYYY-MM-DD; needed with --age."),
		age: ageFlag,
	}),
	flagDocuments: [carryInFlagDocument],
	output: compareView,
	render: compareHint,
	examples: [
		{
			command: "traj projection compare base early --as-of 2026-03-31 --horizon 2027-03-30 --json",
			description: "How two Scenarios differ in FI date, net worth and run-out.",
		},
		{
			command:
				"traj projection compare base --as-of 2026-03-31 --horizon 2027-03-30 --set flows.salary.amount=9000000 --birth-date 1985-06-15 --age 45 --age 50",
			description: "A what-if against the base, with net worth at two ages.",
		},
		{
			command: `traj projection compare base --as-of 2026-03-31 --horizon 2027-03-30 --set 'flows.salary.amount="90000.50"' --decimal --json`,
			description: "A what-if whose salary is a decimal amount in THB, not satang.",
		},
	],
	errorCodes: PROJECTION_ERROR_CODES,
	run: async (input, ctx) => {
		const records = input.carryIn === undefined ? [] : await readCarryIn(input.carryIn, ctx.stdin)
		if (isAppError(records)) return records
		const ages = input.age ?? []
		const problem =
			whatIfProblem(input.b, input.set ?? [], input.without ?? [], input.add ?? []) ??
			agesProblem(ages, input.birthDate)
		if (problem !== null) return problem
		return withProjection(input, ctx, (prepare) => compared({ input, records, ages, prepare }))
	},
})
