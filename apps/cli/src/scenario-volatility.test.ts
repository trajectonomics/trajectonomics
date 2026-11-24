import { describe, expect, it } from "bun:test"
import { PLAN_VOLATILITY, VOLATILE_PLAN } from "./projection/plan-model-testing"
import { fromDecimalForm, toDecimalForm } from "./scenario/decimal"
import { applyScenario, scenarioHome } from "./scenario-test-support"
import { capture, errorOf } from "./test-support"

/*
 * An asset Account's `volatility` is a document field (cli ADR-0068): `scenario apply` takes it,
 * `traj schema` describes it, the engine refuses it where it has no meaning, and `--decimal` leaves it
 * as the integer of basis points `rate` is beside it.
 */

const accounts = (patch: Record<string, unknown>, id?: string) =>
	VOLATILE_PLAN.accounts.map((entry) =>
		id === undefined || entry.id === id ? { ...entry, ...patch } : entry,
	)

describe("an Account's volatility", () => {
	it("is taken by scenario apply and kept as stated", async () => {
		const home = scenarioHome()
		const res = await applyScenario(home, "volatile", VOLATILE_PLAN)
		expect(res.code).toBe(0)
		const shown = await capture(["scenario", "show", "volatile", "--json"], { TRAJ_HOME: home })
		const document = JSON.parse(shown.out).scenario.document as typeof VOLATILE_PLAN
		expect(
			document.accounts.some((a) => a.kind === "asset" && a.volatility === PLAN_VOLATILITY),
		).toBe(true)
	})

	it("is refused above 10000 basis points and on a liability, as the engine states", async () => {
		const home = scenarioHome()
		const loan = VOLATILE_PLAN.accounts.find((a) => a.kind === "liability")?.id
		const high = await applyScenario(home, "high", {
			...VOLATILE_PLAN,
			accounts: accounts({ volatility: 10_001 }, VOLATILE_PLAN.accounts[0]?.id),
		})
		expect(high.code).toBe(2)
		expect(errorOf(high).details).toEqual(
			expect.arrayContaining([expect.objectContaining({ code: "RATE_OUT_OF_RANGE" })]),
		)
		const liability = await applyScenario(home, "liability", {
			...VOLATILE_PLAN,
			accounts: accounts({ volatility: 100 }, loan),
		})
		expect(liability.code).toBe(2)
		expect(errorOf(liability).details).toEqual(
			expect.arrayContaining([expect.objectContaining({ code: "LIABILITY_MISUSE" })]),
		)
	})

	it("is published by traj schema, in basis points, with the one command that reads it", async () => {
		const res = await capture(["schema", "scenario", "apply", "--json"], {
			TRAJ_HOME: scenarioHome(),
		})
		expect(res.code).toBe(0)
		expect(res.out).toContain("--return-model plan")
		const text = JSON.stringify(JSON.parse(res.out))
		expect(text).toContain("standard deviation")
	})

	it("stays an integer of basis points in the decimal form, and round-trips", () => {
		const decimal = toDecimalForm(VOLATILE_PLAN as unknown as Record<string, unknown>)
		expect(JSON.stringify(decimal)).toContain(`"volatility":${PLAN_VOLATILITY}`)
		expect(fromDecimalForm(decimal as Record<string, unknown>)).toEqual(VOLATILE_PLAN)
	})
})
