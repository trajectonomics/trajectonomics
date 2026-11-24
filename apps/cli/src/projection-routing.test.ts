import { describe, expect, it } from "bun:test"
import { projection } from "./projection/testing"
import { linesOf, satang } from "./projection-income-read"
import { PLAIN_PLAN, ROUTING_FLAGS, routingHome } from "./projection-routing-plan"
import { runBody, tableOf } from "./projection-run-support"

/*
 * What a share step, a Reserve floor, a target that keeps its value and a transfer did, stated by `projection run`
 * (cli ADR-0070). The plan is worked by hand in projection-routing-plan.ts, so each figure is the engine's and
 * is also the one the plan's numbers give.
 */

const run = async (home: string, extra: readonly string[] = []) => {
	const res = await projection(home, ["run", ...ROUTING_FLAGS, "--breakdown", ...extra])
	expect(res.err).toBe("")
	expect(res.code).toBe(0)
	return runBody(res)
}

describe("the annual row states what the transfers moved", () => {
	it("is 30,000.00 rolled into the RMF and 3,000.00 paid on the debt in 2026, and nothing on 1 January 2027", async () => {
		const rows = tableOf(await run(await routingHome()), "annual").rows
		expect(rows.map((row) => row.transfers)).toEqual(["33000.00", "0.00"])
	})

	it("states nothing for a plan with no transfer Flow", async () => {
		const rows = tableOf(await run(await routingHome(PLAIN_PLAN)), "annual").rows
		expect(rows.every((row) => !("transfers" in row))).toBe(true)
	})
})

describe("the transfers table lists each Flow's moved and unmoved amount", () => {
	it("moves the whole provident fund and pays the debt off, then cannot move what no loan owes", async () => {
		const table = tableOf(await run(await routingHome()), "transfers")
		expect(table.count).toBe(table.rows.length)
		expect(
			table.rows.map((row) => [
				row.index,
				row.flow,
				row.source,
				row.target,
				row.amount,
				row.unmoved,
			]),
		).toEqual([
			// Six of 5,000.00 had landed in the fund before 1 July; the Flow reads it before that day's lands.
			[0, "roll-pvd", "pvd", "rmf", "30000.00", "0.00"],
			// 1,000.00 on 1 April, May and June pays the 3,000.00 borrowed; nine were planned, six moved nothing.
			[0, "pay-debt", "funds", "debt", "3000.00", "6000.00"],
			[1, "pay-debt", "funds", "debt", "0.00", "1000.00"],
		])
	})

	it("is absent without --breakdown and for a plan with no transfer", async () => {
		const home = await routingHome()
		const without = runBody(await projection(home, ["run", ...ROUTING_FLAGS]))
		expect(without.tables.map((table) => table.name)).toEqual(["annual"])
		const plain = await run(await routingHome(PLAIN_PLAN))
		expect(plain.tables.map((table) => table.name)).toEqual([
			"annual",
			"cashflow",
			"cashflowTotals",
		])
	})

	it("is outside the cash flow: no line and no total counts a transfer", async () => {
		const body = await run(await routingHome())
		const groups = new Set(tableOf(body, "cashflow").rows.map((row) => row.group))
		expect(groups.has("transfer" as never)).toBe(false)
		const [first] = tableOf(body, "annual").rows
		const totals = tableOf(body, "cashflowTotals").rows.filter((row) => row.index === 0)
		const total = (name: string) => satang([totals.find((row) => row.total === name)?.amount ?? ""])
		// money in + unmet = tax + spending + saving + left over, with the transfers on neither side.
		expect(total("money in") + total("unmet")).toBe(
			total("tax") + total("spending") + total("saving") + total("left over"),
		)
		expect(first?.transfers).toBe("33000.00")
	})
})

describe("the cash flow states each routing step and entry as the engine routed it", () => {
	it("fills 2026's surplus as the plan's numbers give: 100,000.00, then half of what is left", async () => {
		const body = await run(await routingHome())
		const surplus = linesOf(body, 0, "surplus").map((line) => [line.account, line.amount])
		// January 68,000 and February 32,000 fill `emergency` to its 100,000; the 1 October repair leaves no
		// surplus, and November (65,000) and December (24,000) refill it. Half of what is left each other month
		// goes to `funds`: 16,500 in February, 32,500 from March to September, 20,500 in December.
		expect(surplus).toEqual([
			["emergency", "189000.00"],
			["funds", "264500.00"],
			["cash", "264500.00"],
		])
	})

	it("keeps the target in today's money: on 1 January 2027 it is 103,000.00, so only 3,000.00 is filled", async () => {
		const body = await run(await routingHome())
		expect(linesOf(body, 1, "surplus").map((line) => [line.account, line.amount])).toEqual([
			["emergency", "3000.00"],
			["funds", "31000.00"],
			["cash", "31000.00"],
		])
	})

	it("numbers each draw by its entry, so a repeated Account reports once per entry", async () => {
		const body = await run(await routingHome())
		const drawn = linesOf(body, 0, "drawn").map((line) => [line.entry, line.account, line.amount])
		// The repair leaves 330,000.00 to find (the 5,000.00 into the provident fund is not funded that day):
		// 80,000.00 of `emergency` down to its 20,000.00 floor, all 241,000.00 of `funds`, then 9,000.00 of what
		// is left of `emergency`.
		expect(drawn).toEqual([
			[0, "emergency", "80000.00"],
			[1, "funds", "241000.00"],
			[2, "emergency", "9000.00"],
		])
		expect(satang(drawn.map((line) => String(line[2])))).toBe(33_000_000n)
	})

	it("numbers no draw of a plain list", async () => {
		const body = await run(await routingHome(PLAIN_PLAN))
		expect(tableOf(body, "cashflow").rows.every((row) => !("entry" in row))).toBe(true)
	})

	it("holds the identity of sim ADR-0018 in every roll-up, with a floor and a share", async () => {
		const body = await run(await routingHome())
		for (const rollup of tableOf(body, "annual").rows) {
			const totals = tableOf(body, "cashflowTotals").rows.filter(
				(row) => row.index === rollup.index,
			)
			const total = (name: string) =>
				satang([totals.find((row) => row.total === name)?.amount ?? ""])
			expect(total("money in") + total("unmet")).toBe(
				total("tax") + total("spending") + total("saving") + total("left over"),
			)
		}
	})
})

describe("the liability statement marks the transfers that paid it down", () => {
	it("states `transferred` on a loan a transfer pays, and the month adds up", async () => {
		const body = runBody(
			await projection(await routingHome(), ["run", ...ROUTING_FLAGS, "--liabilities"]),
		)
		const months = tableOf(body, "liabilities").rows
		expect(
			months
				.filter((row) => row.transferred !== "0.00" && row.transferred !== undefined)
				.map((row) => [row.from, row.transferred, row.closing]),
		).toEqual([
			["2026-04-01", "1000.00", "2000.00"],
			["2026-05-01", "1000.00", "1000.00"],
			["2026-06-01", "1000.00", "0.00"],
		])
		for (const row of months) {
			// opening + drawn + interest - paid - transferred = closing, exactly.
			expect(
				satang([row.opening, row.drawn, row.interest]) -
					satang([row.paid, row.transferred ?? "0.00"]),
			).toBe(satang([row.closing]))
		}
		expect(tableOf(body, "paidOff").rows).toEqual([{ account: "debt", date: "2026-06-01" }])
	})

	it("states no `transferred` on a plan whose loan no transfer pays", async () => {
		const body = runBody(
			await projection(await routingHome(PLAIN_PLAN), ["run", ...ROUTING_FLAGS, "--liabilities"]),
		)
		expect(tableOf(body, "liabilities").rows.every((row) => !("transferred" in row))).toBe(true)
	})
})
