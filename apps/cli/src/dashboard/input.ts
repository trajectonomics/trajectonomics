import { checkParams, type PlanParams, readsOf, type Snapshot } from "@trajectonomics/web/serve"
import { z } from "zod"
import { type AppError, fail } from "../errors"

/** The flags of `traj dashboard`, once parsed (the schema is the leaf's, in leaf.ts). */
export type DashboardInput = {
	asOf: string
	horizon: string
	scenario?: string[] | undefined
	compare?: string[] | undefined
	birthDate?: string | undefined
	age?: number[] | undefined
	monthly: boolean
	carryIn?: string | undefined
	port: number
}

/** The Snapshot Plan's parameters from the flags, or the first rule they break. */
export function planOf(input: DashboardInput): PlanParams | AppError {
	const compare = input.compare ?? []
	if (compare.length !== 0 && compare.length !== 2) {
		return fail("invalid_input", {
			path: "compare",
			message: "--compare takes two Scenario names: pass --compare twice.",
		})
	}
	const [a = "", b = ""] = compare
	const plan = checkParams({
		asOf: input.asOf,
		horizon: input.horizon,
		scenarios: input.scenario ?? [],
		compare: compare.length === 2 ? { a, b } : null,
		birthDate: input.birthDate ?? null,
		ages: input.age ?? [],
		monthly: input.monthly,
		carryIn: input.carryIn !== undefined,
	})
	return plan.ok ? plan.params : fail("invalid_input", { message: plan.error.message })
}

/** What `traj dashboard` prints once it stops. */
export type DashboardSummary = {
	url: string
	asOf: string
	horizon: string
	reads: number
	failedReads: string[]
}

export const dashboardOutput: z.ZodType<DashboardSummary> = z.strictObject({
	url: z.string().describe("Where the Dashboard was served, on 127.0.0.1."),
	asOf: z.string().describe("The As-of the Snapshot was read at, as YYYY-MM-DD."),
	horizon: z.string().describe("The date the Snapshot's projections end at, as YYYY-MM-DD."),
	reads: z.number().int().describe("How many read leaves the Snapshot ran."),
	failedReads: z
		.array(z.string())
		.describe("The command of each read that failed; its page showed the error instead."),
})

/** The result once the server has stopped: where it was, and which reads failed. */
export function summaryOf(url: string, params: PlanParams, snapshot: Snapshot): DashboardSummary {
	const reads = readsOf(snapshot)
	return {
		url,
		asOf: params.asOf,
		horizon: params.horizon,
		reads: reads.length,
		failedReads: reads.filter((read) => !read.ok).map((read) => `traj ${read.argv.join(" ")}`),
	}
}
