import { describe, expect, it } from "bun:test"
import { PROJECTION_SCENARIO, projection, seededHome } from "./projection/testing"
import { runBody, tableOf } from "./projection-run-support"
import { applyScenario } from "./scenario-test-support"

/*
 * What `projection run --estate` does with an estate block the engine or the document check refuses
 * (cli ADR-0064), and with one whose net is negative.
 */

describe("an estate block the engine or the document check refuses", () => {
	const flags = [
		"--scenario",
		"big",
		"--as-of",
		"2026-03-31",
		"--horizon",
		"2027-03-30",
		"--estate",
	]

	/** The fixture plan with one estate block, stored as `big`. */
	async function homeWith(
		estate: Record<string, unknown>,
	): Promise<{ home: string; code: number; err: string }> {
		const home = seededHome()
		const applied = await applyScenario(home, "big", { ...PROJECTION_SCENARIO, estate })
		return { home, code: applied.code, err: applied.err }
	}

	it("states a negative net as it is, with no gift and nothing for heirs", async () => {
		const fee = { id: "fee", amount: 999_999_999_999, growth: { bps: 0 } }
		const gift = { id: "temple", of: "net", bps: 500, rounding: "floor" }
		const { home } = await homeWith({ costs: [fee], gifts: [gift] })
		const row = tableOf(runBody(await projection(home, ["run", ...flags])), "estate").rows[0]
		expect(row?.net.startsWith("-")).toBe(true)
		expect(row?.gifts).toBe("0.00")
		expect(row?.toHeirs).toBe("0.00")
		expect(row?.realToHeirs).toBe("0.00")
	})

	it("refuses one overflowing line as VALUE_OVERFLOW for the whole projection", async () => {
		const fee = { id: "fee", amount: Number.MAX_SAFE_INTEGER, growth: { bps: 0 } }
		const { home } = await homeWith({ costs: [fee, { ...fee, id: "fee2" }] })
		const res = await projection(home, ["run", ...flags])
		expect(res.code).not.toBe(0)
		expect(res.err).toContain("VALUE_OVERFLOW")
	})

	it("refuses an unknown Account and a share above 100% at the path the document names", async () => {
		const unknown = await homeWith({
			costs: [{ id: "sell", of: { accounts: ["nowhere"] }, bps: 100, rounding: "floor" }],
		})
		expect(unknown.code).not.toBe(0)
		expect(unknown.err).toContain("document.estate.costs.0.of.accounts.0")
		const over = await homeWith({
			costs: [{ id: "all", of: "gross", bps: 10_001, rounding: "floor" }],
		})
		expect(over.code).not.toBe(0)
		expect(over.err).toContain("document.estate.costs.0.bps")
		expect(over.err).toContain("RATE_OUT_OF_RANGE")
	})
})
