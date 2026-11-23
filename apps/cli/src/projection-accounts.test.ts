import { describe, expect, it } from "bun:test"
import simPackage from "../package.json"
import { goldenTextIn, recordGoldenTextIn } from "./golden-test-support"
import { projection } from "./projection/testing"
import { balanceOn, exampleHome, HOME_FLAGS } from "./projection-accounts-support"
import { runBody, tableOf } from "./projection-run-support"
import { capture } from "./test-support"

/*
 * `projection run --accounts` (cli ADR-0060). The golden pins the bytes of the worked example's home
 * through its whole life; the figures the engine states are checked by hand beside it.
 */

const GOLDENS = new URL("./projection/fixtures/", import.meta.url)
const ALL = ["--accounts", "--liabilities", "--breakdown"]

describe("projection run --accounts: the bytes are pinned", () => {
	it("pins the JSON of the example's home, byte for byte, with the Scenario's minted id replaced", async () => {
		const home = await exampleHome()
		const res = await projection(home, ["run", ...HOME_FLAGS, ...ALL])
		expect(res.code).toBe(0)
		expect(res.err).toBe("")
		const id = runBody(res).scenario.id
		const text = `${res.out.replace(`"${id}"`, '"the-scenario-id"')}\n`
		expect((JSON.parse(text) as { engine: { version: string } }).engine.version).toBe(
			simPackage.version,
		)
		await recordGoldenTextIn(GOLDENS, "run-accounts.output", text)
		expect(await goldenTextIn(GOLDENS, "run-accounts.output")).toBe(text)
	})
})

describe("the home's value, read by hand from the engine's monthly rows", () => {
	const run = async () =>
		runBody(
			await projection(await exampleHome(), ["run", ...HOME_FLAGS, "--accounts", "--monthly"]),
		)

	it("holds nothing before the purchase, then the price: 15,000.00 on 1 July 2027", async () => {
		const body = await run()
		expect(balanceOn(body, "home", "2027-06-01").amount).toBe("0.00")
		expect(balanceOn(body, "home", "2027-07-01").amount).toBe("15000.00")
	})

	it("rises 3% a year from the purchase: 15,000.00 x 1.03 and x 1.03^2 on each anniversary", async () => {
		const body = await run()
		expect(balanceOn(body, "home", "2028-07-01").amount).toBe("15450.00")
		expect(balanceOn(body, "home", "2029-07-01").amount).toBe("15913.50")
	})

	it("states the value in start-of-plan money too: 3% growth under 3% inflation is flat", async () => {
		const body = await run()
		expect(balanceOn(body, "home", "2028-07-01").real).toBe(
			balanceOn(body, "home", "2029-07-01").real,
		)
	})

	it("states the loan as what is owed, positive: 12,000.00 drawn on the purchase date", async () => {
		const body = await run()
		expect(balanceOn(body, "home-loan", "2027-07-01").amount).toBe("12000.00")
		expect(Number(balanceOn(body, "home-loan", "2030-07-01").amount)).toBeGreaterThan(0)
	})

	it("holds nothing after the sale, and the loan is still owed", async () => {
		const body = await run()
		expect(balanceOn(body, "home", "2030-07-01").amount).toBe("0.00")
		expect(balanceOn(body, "home", "2030-08-01").amount).toBe("0.00")
		expect(Number(balanceOn(body, "home-loan", "2030-08-01").amount)).toBeGreaterThan(0)
	})
})

describe("the cash flow of the home, read by hand", () => {
	it("sells at the value: 15,000.00 x 1.03^3 = 16,390.905 lands as 16,390.91, and the payment is the loan's level 94.90", async () => {
		const body = runBody(await projection(await exampleHome(), ["run", ...HOME_FLAGS, ...ALL]))
		const lines = tableOf(body, "cashflow").rows
		const line = (id: string, index: number) =>
			lines.find((entry) => entry.id === id && entry.index === index)?.amount
		expect(line("home-sale", 4)).toBe("16390.91")
		expect(line("home-purchase", 1)).toBe("15000.00")
		expect(line("home-loan-draw", 1)).toBe("12000.00")
		// 12 payments of 94.90, a whole year; the draw's own year has five of them, 474.50.
		expect(line("home-loan-payment", 2)).toBe("1138.80")
		expect(line("home-loan-payment", 1)).toBe("474.50")
		// Five months of 80.00 rent in 2027 (the Flow starts on 1 August).
		expect(line("home-rent", 1)).toBe("400.00")
	})
})

describe("--accounts adds one table and changes nothing else", () => {
	it("leaves every other table, and the whole of a run without it, as it was", async () => {
		const home = await exampleHome()
		const plain = runBody(await projection(home, ["run", ...HOME_FLAGS]))
		const asked = runBody(await projection(home, ["run", ...HOME_FLAGS, "--accounts"]))
		expect(plain.tables.map((table) => table.name)).toEqual(["annual", "milestones"])
		expect(asked.tables.map((table) => table.name)).toEqual(["annual", "balances", "milestones"])
		const { tables: askedTables, ...askedRest } = asked
		const { tables: plainTables, ...plainRest } = plain
		expect(askedRest).toEqual(plainRest)
		expect(JSON.stringify(askedTables.filter((table) => table.name !== "balances"))).toBe(
			JSON.stringify(plainTables),
		)
	})

	it("states each year's end once, every Account in Scenario order, on the annual rows' own dates", async () => {
		const body = runBody(
			await projection(await exampleHome(), ["run", ...HOME_FLAGS, "--accounts"]),
		)
		const rows = tableOf(body, "balances").rows
		const accounts = ["cash", "index", "pension", "loan", "car", "home", "home-loan"] // Scenario order, not the engine's by id
		const dates = tableOf(body, "annual").rows.map((row) => row.realNetWorth.date)
		expect([...new Set(dates)]).toEqual([...new Set(rows.map((row) => row.date))])
		expect(rows.map((row) => row.account)).toEqual([...new Set(dates)].flatMap(() => accounts))
		expect(tableOf(body, "balances").count).toBe(rows.length)
	})

	it("states every month with --monthly", async () => {
		const body = runBody(
			await projection(await exampleHome(), ["run", ...HOME_FLAGS, "--accounts", "--monthly"]),
		)
		const months = tableOf(body, "monthly").rows.length
		expect(tableOf(body, "balances").rows).toHaveLength(months * 7)
	})
})

describe("the human form", () => {
	it("prints a table of Accounts by year only with the flag", async () => {
		const home = await exampleHome()
		const flags = ["projection", "run", ...HOME_FLAGS]
		const plain = await capture(flags, { TRAJ_HOME: home })
		const asked = await capture([...flags, "--accounts"], { TRAJ_HOME: home })
		expect(plain.out).not.toContain("accounts (")
		expect(asked.out).toContain("accounts (5 rows)")
		expect(asked.out).toContain("home-loan")
		expect(asked.out).not.toContain("balances (")
		expect(asked.out.startsWith(plain.out.split("\nmilestones")[0] ?? "")).toBe(true)
	})
})
