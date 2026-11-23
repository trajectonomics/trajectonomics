import { describe, expect, it } from "bun:test"
import simPackage from "../package.json"
import { goldenTextIn, recordGoldenTextIn } from "./golden-test-support"
import { projection } from "./projection/testing"
import { exampleHome, HOME_FLAGS } from "./projection-accounts-support"
import {
	balancesOn,
	estateOn,
	halfUp,
	linesOn,
	major,
	minor,
	plainHome,
} from "./projection-estate-support"
import { runBody, tableOf } from "./projection-run-support"
import { capture } from "./test-support"

/*
 * `projection run --estate` (cli ADR-0064). The golden pins the bytes of the worked example's estate
 * with its home, its loan and its three lines; the figures the engine states are checked by hand
 * beside it, in exact integers, from the balances the same run states.
 */

const GOLDENS = new URL("./projection/fixtures/", import.meta.url)
const FLAGS = [...HOME_FLAGS, "--estate", "--accounts"]
/** The row at a roll-up end the home is held on, with its loan: the year after its purchase. */
const WITH_HOME = "2029-01-15"

describe("projection run --estate: the bytes are pinned", () => {
	it("pins the example's estate with --accounts, byte for byte, with the Scenario's minted id replaced", async () => {
		const res = await projection(await exampleHome(), ["run", ...FLAGS])
		expect(res.code).toBe(0)
		expect(res.err).toBe("")
		const id = runBody(res).scenario.id
		const text = `${res.out.replace(`"${id}"`, '"the-scenario-id"')}\n`
		expect((JSON.parse(text) as { engine: { version: string } }).engine.version).toBe(
			simPackage.version,
		)
		await recordGoldenTextIn(GOLDENS, "run-estate.output", text)
		expect(await goldenTextIn(GOLDENS, "run-estate.output")).toBe(text)
	})

	it("pins the human form: one table of the estate by year", async () => {
		const res = await capture(["projection", "run", ...HOME_FLAGS, "--estate"], {
			TRAJ_HOME: await exampleHome(),
		})
		expect(res.code).toBe(0)
		expect(res.err).toBe("")
		await recordGoldenTextIn(GOLDENS, "run-estate-human.output", res.out)
		expect(await goldenTextIn(GOLDENS, "run-estate-human.output")).toBe(res.out)
	})
})

describe("the example's estate, worked out by hand from the same run's balances", () => {
	const run = async () => runBody(await projection(await exampleHome(), ["run", ...FLAGS]))

	it("counts the home in the gross estate and the loan as a debt, from each Account's value", async () => {
		const body = await run()
		const balances = balancesOn(body, WITH_HOME)
		const sum = (accounts: string[]) =>
			accounts.reduce(
				(total, id) => total + minor(balances.find((row) => row.account === id)?.amount ?? "0"),
				0n,
			)
		const row = estateOn(body, WITH_HOME)
		expect(
			minor(balances.find((entry) => entry.account === "home")?.amount ?? "0"),
		).toBeGreaterThan(0n)
		expect(row.gross).toBe(major(sum(["cash", "index", "pension", "home"])))
		expect(row.debts).toBe(major(sum(["loan", "car", "home-loan"])))
	})

	it("states each cost and the gift as the block's share of its base, in the block's order", async () => {
		const body = await run()
		const gross = minor(estateOn(body, WITH_HOME).gross)
		const home = minor(
			balancesOn(body, WITH_HOME).find((row) => row.account === "home")?.amount ?? "0",
		)
		const lines = linesOn(body, WITH_HOME)
		expect(lines.map((line) => [line.line, line.kind])).toEqual([
			["settlement", "cost"],
			["home-selling", "cost"],
			["temple", "gift"],
		])
		expect(lines[0]?.amount).toBe(major(halfUp(gross, 100n)))
		expect(lines[1]?.amount).toBe(major(halfUp(home, 300n)))
		const row = estateOn(body, WITH_HOME)
		const net =
			minor(row.gross) -
			minor(row.debts) -
			minor(lines[0]?.amount ?? "0") -
			minor(lines[1]?.amount ?? "0")
		expect(row.net).toBe(major(net))
		expect(lines[2]?.amount).toBe(major(halfUp(net, 500n)))
	})

	it("states what heirs receive: the net estate less the gift, and the totals as the lines' sums", async () => {
		const row = estateOn(await run(), WITH_HOME)
		const body = await run()
		const [settlement, selling, temple] = linesOn(body, WITH_HOME).map((line) => minor(line.amount))
		expect(row.costs).toBe(major((settlement ?? 0n) + (selling ?? 0n)))
		expect(row.gifts).toBe(major(temple ?? 0n))
		expect(row.toHeirs).toBe(major(minor(row.net) - (temple ?? 0n)))
		expect(minor(row.gross) - minor(row.debts) - minor(row.costs) - minor(row.gifts)).toBe(
			minor(row.toHeirs),
		)
	})

	it("states the home's cost as nothing once it is sold, and the estate on every roll-up end", async () => {
		const body = await run()
		const ends = tableOf(body, "annual").rows.map((row) => row.realNetWorth.date)
		expect(tableOf(body, "estate").rows.map((row) => row.date)).toEqual([...new Set(ends)])
		const after = linesOn(body, "2031-01-01").find((line) => line.line === "home-selling")
		expect(after?.amount).toBe("0.00")
	})

	it("states every month with --monthly", async () => {
		const body = runBody(
			await projection(await exampleHome(), ["run", ...HOME_FLAGS, "--estate", "--monthly"]),
		)
		expect(tableOf(body, "estate").rows).toHaveLength(tableOf(body, "monthly").rows.length)
	})
})

describe("a plan with no estate block", () => {
	const flags = ["--scenario", "plain", "--as-of", "2026-03-31", "--horizon", "2027-03-30"]

	it("still states gross less debts, with no cost or gift, and says no settlement cost is stated", async () => {
		const body = runBody(await projection(await plainHome(), ["run", ...flags, "--estate"]))
		const last = tableOf(body, "estate").rows.at(-1)
		expect(last).toBeDefined()
		for (const row of tableOf(body, "estate").rows) {
			expect(row.costs).toBe("0.00")
			expect(row.gifts).toBe("0.00")
			expect(minor(row.net)).toBe(minor(row.gross) - minor(row.debts))
			expect(row.toHeirs).toBe(row.net)
		}
		expect(tableOf(body, "estateLines")).toEqual({ name: "estateLines", count: 0, rows: [] })
		expect(body.notes.join(" ")).toContain("states no settlement cost")
	})

	it("states the net in today's money as the row's realNetWorth, which the empty block leaves alone", async () => {
		const body = runBody(await projection(await plainHome(), ["run", ...flags, "--estate"]))
		const annual = tableOf(body, "annual").rows
		const estate = tableOf(body, "estate").rows
		expect(estate.map((row) => row.realNet)).toEqual(annual.map((row) => row.realNetWorth.amount))
	})
})

describe("--estate adds two tables and changes nothing else", () => {
	it("leaves every other table, and the whole of a run without it, as it was", async () => {
		const home = await exampleHome()
		const plain = runBody(await projection(home, ["run", ...HOME_FLAGS]))
		const asked = runBody(await projection(home, ["run", ...HOME_FLAGS, "--estate"]))
		expect(plain.tables.map((table) => table.name)).toEqual(["annual", "milestones"])
		expect(asked.tables.map((table) => table.name)).toEqual([
			"annual",
			"estate",
			"estateLines",
			"milestones",
		])
		const { tables: askedTables, ...askedRest } = asked
		const { tables: plainTables, ...plainRest } = plain
		expect(askedRest).toEqual(plainRest)
		expect(JSON.stringify(askedTables.filter((table) => !table.name.startsWith("estate")))).toBe(
			JSON.stringify(plainTables),
		)
	})

	it("prints nothing of it in the human form without the flag, and one table with it", async () => {
		const home = await exampleHome()
		const flags = ["projection", "run", ...HOME_FLAGS]
		const plain = await capture(flags, { TRAJ_HOME: home })
		const asked = await capture([...flags, "--estate"], { TRAJ_HOME: home })
		expect(plain.out).not.toContain("estate")
		expect(asked.out).toContain("estate (5 rows)")
		expect(asked.out).not.toContain("estateLines")
		expect(asked.out.startsWith(plain.out.split("\nmilestones")[0] ?? "")).toBe(true)
	})
})
