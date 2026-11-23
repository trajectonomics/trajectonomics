// `--set estate=<json>` begins an estate block a plan lacks (cli ADR-0065), on a read and on `scenario apply`.
import { describe, expect, it } from "bun:test"
import { errorOf, projection } from "./projection/testing"
import { plainHome } from "./projection-estate-support"
import { runBody, tableOf } from "./projection-run-support"
import { echoed } from "./projection-what-if-support"
import { apply, bodyOf, stored } from "./scenario-what-if-support"

const FLAGS = [
	"--scenario",
	"plain",
	"--as-of",
	"2026-03-31",
	"--horizon",
	"2027-03-30",
	"--estate",
]
const COST = { id: "settle", of: "gross", bps: 100, rounding: "halfUp" }
const FEE = { id: "fee", amount: 5_000_000, growth: { bps: 0 } }
const BLOCK = {
	costs: [COST, FEE],
	gifts: [{ id: "temple", of: "net", bps: 500, rounding: "halfUp" }],
}
const SET = ["--set", `estate=${JSON.stringify(BLOCK)}`]

describe("--set estate=<json> on a plan with no estate block", () => {
	it("projects the block's lines, and echoes the Set", async () => {
		const home = await plainHome()
		const res = await projection(home, ["run", ...FLAGS, ...SET])
		expect(res.code).toBe(0)
		const lines = tableOf(runBody(res), "estateLines").rows
		expect(lines.map((line) => line.line)).toEqual(["settle", "fee", "temple"])
		expect(echoed(res).overrides).toEqual([{ path: "estate", value: BLOCK }])
		const plain = await projection(home, ["run", ...FLAGS])
		expect(tableOf(runBody(plain), "estateLines").rows).toEqual([])
	})

	it("stores the hash the read echoes, so the saved plan is the projected one", async () => {
		const home = await plainHome()
		const projected = echoed(await projection(home, ["run", ...FLAGS, ...SET]))
		const res = await apply(home, ["plain", ...SET])
		expect(res.code).toBe(0)
		const body = bodyOf(res)
		expect(body.status).toBe("updated")
		expect(body.scenario.document["estate"]).toEqual(BLOCK)
		expect(body.scenario.contentHash).toBe(projected.scenario.effectiveContentHash)
		expect((await stored(home, "plain")).contentHash).toBe(projected.scenario.effectiveContentHash)
		expect(body.droppedAnchors).toEqual([])
	})

	it("reads a percent and an amount as decimal strings under --decimal, and hashes as minor units do", async () => {
		const home = await plainHome()
		const decimal = {
			costs: [
				{ ...COST, bps: "1.00" },
				{ ...FEE, amount: "50000.00" },
			],
			gifts: [{ id: "temple", of: "net", bps: "5.00", rounding: "halfUp" }],
		}
		const read = await projection(home, [
			"run",
			...FLAGS,
			"--set",
			`estate=${JSON.stringify(decimal)}`,
			"--decimal",
		])
		expect(read.code).toBe(0)
		const minor = echoed(await projection(home, ["run", ...FLAGS, ...SET]))
		expect(echoed(read).scenario.effectiveContentHash).toBe(minor.scenario.effectiveContentHash)
		const written = await apply(home, [
			"plain",
			"--set",
			`estate=${JSON.stringify(decimal)}`,
			"--decimal",
		])
		expect(written.code).toBe(0)
		expect(bodyOf(written).scenario.contentHash).toBe(minor.scenario.effectiveContentHash)
		expect((await stored(home, "plain")).contentHash).toBe(minor.scenario.effectiveContentHash)
	})

	it("checks the begun block with the engine, and words a share over 100%", async () => {
		const home = await plainHome()
		const over = { costs: [{ ...COST, bps: 10_001 }] }
		const res = await projection(home, ["run", ...FLAGS, "--set", `estate=${JSON.stringify(over)}`])
		expect(res.code).toBe(2)
		const error = errorOf(res)
		expect(error.path).toBe("--set")
		expect(error.message).toContain("document.estate.costs.0.bps")
		expect(error.message).toContain("must be from 0% to 100%")
		expect(error.message).toContain("RATE_OUT_OF_RANGE. ")
		const stored = await apply(home, ["plain", "--set", `estate=${JSON.stringify(over)}`])
		expect(stored.code).toBe(2)
	})

	it("refuses a part of a block the plan lacks, and says to begin it whole", async () => {
		const home = await plainHome()
		const res = await projection(home, [
			"run",
			...FLAGS,
			"--set",
			`estate.costs=${JSON.stringify([COST])}`,
		])
		expect(res.code).toBe(2)
		expect(errorOf(res).message).toContain('no "estate" block yet')
		expect(errorOf(res).hint).toContain("--set estate=<json>")
	})

	it("refuses another key the plan lacks, as before", async () => {
		const home = await plainHome()
		const res = await projection(home, ["run", ...FLAGS, "--set", 'calendar={"holidays":[]}'])
		expect(res.code).toBe(2)
		expect(errorOf(res).message).toContain('No key or id "calendar"')
	})
})
