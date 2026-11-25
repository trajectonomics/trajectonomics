import { describe, expect, it } from "bun:test"
import { goldenTextIn, recordGoldenTextIn } from "./golden-test-support"
import { projection } from "./projection/testing"
import { satang } from "./projection-income-read"
import { INCOME_FLAGS, planHome } from "./projection-income-support"
import { withFund } from "./projection-lifetime-support"
import { runBody, tableOf } from "./projection-run-support"
import { capture } from "./test-support"

/*
 * What a plan's fees and payouts came to over the horizon, stated by `projection run` (cli ADR-0067): the
 * engine's own totals in the CLI's money, the plan's fees labelled apart from each Account's in the human
 * form, and no field at all without a fee or a payout. Re-baseline the goldens deliberately with
 * TRAJ_UPDATE_GOLDEN=1 bun test src/projection-lifetime.test.ts
 */

const GOLDENS = new URL("./projection/fixtures/", import.meta.url)
const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g

const PAYOUT = { bps: 400, frequency: "quarterly", rounding: "floor" }
const FEE = { bps: 150, rounding: "halfUp" }

const run = async (home: string, extra: readonly string[] = []) => {
	const res = await projection(home, ["run", ...INCOME_FLAGS, ...extra])
	expect(res.err).toBe("")
	expect(res.code).toBe(0)
	return res
}

describe("the Projection states each Account's fees and payouts over the plan", () => {
	it("states the fund's totals and the plan's fees, each the sum of the figures the run already states", async () => {
		const body = runBody(await run(await planHome()))
		expect(body.accountLifetimes).toEqual([
			{ account: "fund", lifetimeFees: "1514.01", lifetimePayouts: "4051.89" },
		])
		expect(body.lifetimeFees).toBe("1514.01")
		const annual = tableOf(body, "annual").rows
		expect(satang([body.lifetimeFees ?? ""])).toBe(satang(annual.map((row) => row.fees ?? "")))
		expect(satang([body.accountLifetimes?.[0]?.lifetimePayouts ?? ""])).toBe(
			satang(annual.map((row) => row.payouts ?? "")),
		)
		expect(satang([body.lifetimeFees ?? ""])).toBe(
			satang(tableOf(body, "fees").rows.map((row) => row.amount)),
		)
	})

	it("states a fee alone as the fee, and a payout alone with no plan-wide fees", async () => {
		const fee = runBody(await run(await planHome(withFund({ fee: FEE }))))
		const charged = satang(tableOf(fee, "fees").rows.map((row) => row.amount))
		expect(fee.accountLifetimes).toHaveLength(1)
		expect(fee.accountLifetimes?.[0]).not.toHaveProperty("lifetimePayouts")
		expect(satang([fee.accountLifetimes?.[0]?.lifetimeFees ?? ""])).toBe(charged)
		expect(fee.lifetimeFees).toBe(fee.accountLifetimes?.[0]?.lifetimeFees)
		const payout = runBody(await run(await planHome(withFund({ payout: PAYOUT }))))
		expect(payout.accountLifetimes?.[0]).toHaveProperty("lifetimePayouts")
		expect(payout.accountLifetimes?.[0]).not.toHaveProperty("lifetimeFees")
		expect(payout).not.toHaveProperty("lifetimeFees")
	})

	it("states no field without a fee or a payout, and none for a fee or a payout of 0 bps", async () => {
		const bare = await run(await planHome(withFund({})))
		const zero = await run(
			await planHome(withFund({ payout: { ...PAYOUT, bps: 0 }, fee: { ...FEE, bps: 0 } })),
		)
		for (const res of [bare, zero]) {
			expect(res.out).not.toContain("lifetime")
			expect(res.out).not.toContain("accountLifetimes")
		}
		const strip = (text: string) => text.replace(UUID, "").replace(/jcs1:sha256:[0-9a-f]+/g, "")
		expect(strip(zero.out)).toBe(strip(bare.out))
	})

	it("formats the figures as every money figure is, whatever --decimal does to the input", async () => {
		const plain = runBody(await run(await planHome()))
		const decimal = runBody(
			await run(await planHome(), ["--set", "economy.inflation=250", "--decimal"]),
		)
		expect(decimal.accountLifetimes).toEqual(plain.accountLifetimes)
		expect(decimal.lifetimeFees).toBe(plain.lifetimeFees)
	})
})

describe("the human form labels the plan's fees apart from each Account's totals", () => {
	it("prints the plan-wide line, then a table of the Accounts", async () => {
		const res = await capture(["projection", "run", ...INCOME_FLAGS], {
			TRAJ_HOME: await planHome(),
		})
		expect(res.code).toBe(0)
		expect(res.out).toContain("Fees over the plan, all accounts: 1514.01")
		expect(res.out).toContain("accountLifetimes (1 row)")
		expect(res.out).toMatch(/fund\s+1514\.01\s+4051\.89/)
	})

	it("prints no plan-wide line for a payout alone", async () => {
		const home = await planHome(withFund({ payout: PAYOUT }))
		const res = await capture(["projection", "run", ...INCOME_FLAGS], { TRAJ_HOME: home })
		expect(res.out).not.toContain("Fees over the plan")
		expect(res.out).toContain("accountLifetimes (1 row)")
	})

	it("prints nothing about totals when the plan has no fee or payout", async () => {
		const home = await planHome(withFund({}))
		const res = await capture(["projection", "run", ...INCOME_FLAGS], { TRAJ_HOME: home })
		expect(res.out).not.toContain("Fees over the plan")
		expect(res.out).not.toContain("accountLifetimes")
	})
})

describe("projection run with a fee and a payout is pinned by goldens", () => {
	async function expectGolden(name: string, argv: readonly string[]): Promise<void> {
		const res = await capture(["projection", "run", ...INCOME_FLAGS, ...argv], {
			TRAJ_HOME: await planHome(),
		})
		expect(res.code).toBe(0)
		const text = `${res.out.replace(UUID, "the-scenario-id")}\n`
		await recordGoldenTextIn(GOLDENS, name, text)
		expect(await goldenTextIn(GOLDENS, name)).toBe(text)
	}

	it("pins the JSON, byte for byte", async () => {
		await expectGolden("run-lifetime.output", ["--json"])
	})

	it("pins the human form, byte for byte", async () => {
		await expectGolden("run-lifetime-human.output", [])
	})
})
