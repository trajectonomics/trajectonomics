import { describe, expect, it } from "bun:test"
import type { Scenario } from "@trajectonomics/core/sim"
import { SIM_SCENARIO } from "./baseline/fixture"
import { isAppError } from "./errors"
import { HORIZON, projection, projectionHome } from "./projection/testing"
import { withMilestones } from "./projection-milestones-support"
import { toDecimalForm } from "./scenario/decimal"
import { applyScenario, scenario } from "./scenario-test-support"

/*
 * The engine's milestone refusals reach the caller at their path, and a milestone amount round-trips
 * through the decimal form (cli ADR-0047, ADR-0049).
 */

describe("the engine's milestone refusals reach the caller at their path", () => {
	it("refuses a Scenario that names no milestone, at the document path", async () => {
		const home = await projectionHome()
		const bad = {
			...SIM_SCENARIO,
			flows: SIM_SCENARIO.flows.map((flow, index) =>
				index === 0 ? { ...flow, startAt: "ghost" } : flow,
			),
		}
		const res = await applyScenario(home, "ghost-gate", bad)
		expect(res.code).toBe(2)
		const error = JSON.parse(res.err) as {
			error: { code: string; path?: string; details?: { code: string; path?: string }[] }
		}
		expect(error.error.code).toBe("invalid_input")
		expect(error.error.path).toBe("document.flows.0.startAt")
		expect(error.error.details?.map((detail) => detail.code)).toContain("UNKNOWN_MILESTONE")
	})

	it("refuses a --set that gates a flow on an unknown milestone at --set, with the engine's code", async () => {
		// Every milestone code comes from `check()`, which the CLI runs on the overridden document
		// before the engine projects (ADR-0024), so the override is the refusal and not the engine's
		// projection_refused.
		const home = await withMilestones()
		const res = await projection(home, [
			"run",
			"--scenario",
			"milestoned",
			"--as-of",
			"2026-03-31",
			"--horizon",
			HORIZON,
			"--set",
			'flows.salary.startAt="ghost"',
		])
		expect(res.code).toBe(2)
		const error = JSON.parse(res.err) as {
			error: { code: string; path?: string; details?: { code: string; documentPath: string } }
		}
		expect(error.error.code).toBe("invalid_input")
		expect(error.error.path).toBe("--set")
		expect(error.error.details).toMatchObject({
			code: "UNKNOWN_MILESTONE",
			documentPath: "document.flows.0.startAt",
		})
	})
})

describe("a Scenario's milestone amounts round-trip in the decimal form", () => {
	it("reads a threshold amount written as a decimal string, stores it in minor units, and prints it back", async () => {
		const home = await projectionHome()
		const minor: Scenario = {
			...SIM_SCENARIO,
			milestones: [
				{
					id: "wealth",
					combine: "all",
					criteria: [
						{
							id: "threshold",
							kind: "metric",
							metric: "netWorth",
							op: "atLeast",
							amount: 50_000_000,
							terms: "nominal",
						},
					],
				},
			],
		}
		const decimal = toDecimalForm(minor as unknown as Record<string, unknown>)
		if (isAppError(decimal)) throw new Error(decimal.body.message)
		expect(JSON.stringify(decimal)).toContain('"amount":"500000.00"')
		const applied = await applyScenario(home, "decimal-milestone", decimal, ["--decimal"])
		expect(applied.code).toBe(0)
		const stored = await scenario(home, ["show", "decimal-milestone"])
		expect(stored.out).toContain('"amount":50000000')
		const shown = await scenario(home, ["show", "decimal-milestone", "--decimal"])
		expect(shown.out).toContain('"amount":"500000.00"')
	})
})
