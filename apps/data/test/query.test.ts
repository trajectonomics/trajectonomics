import { describe, expect, test } from "bun:test"
import { parseUsageQuery } from "../src/core/query"
import { NOW_MS } from "./support/fixtures"

const SERIES = "measured-by-us"

function parse(search: string) {
	return parseUsageQuery(new URL(`https://data.test/api/usage${search}`), NOW_MS, SERIES)
}

describe("parseUsageQuery", () => {
	test("defaults the report date to today and applies no bounds", () => {
		const result = parse("")
		expect(result).toEqual({
			ok: true,
			query: {
				filter: { series: SERIES, from: null, to: null, plan: null, model: null },
				asOf: "2026-11-25",
			},
		})
	})

	test("keeps from, to, plan and model filters", () => {
		const result = parse("?from=2026-11-01&to=2026-11-20&plan=claude&model=claude-opus-5-5")
		expect(result.ok).toBe(true)
		if (!result.ok) return
		expect(result.query.filter).toEqual({
			series: SERIES,
			from: "2026-11-01",
			to: "2026-11-20",
			plan: "claude",
			model: "claude-opus-5-5",
		})
		expect(result.query.asOf).toBe("2026-11-20")
	})

	test("asOf caps a later to and never widens it", () => {
		const capped = parse("?to=2026-11-25&asOf=2026-11-20")
		expect(capped.ok).toBe(true)
		if (capped.ok) expect(capped.query.filter.to).toBe("2026-11-20")
		const narrower = parse("?to=2026-11-19&asOf=2026-11-20")
		expect(narrower.ok).toBe(true)
		if (narrower.ok) expect(narrower.query.filter.to).toBe("2026-11-19")
	})

	test("rejects a date that is not a real calendar day", () => {
		expect(parse("?from=2026-02-31")).toMatchObject({
			ok: false,
			error: { code: "INVALID_DATE" },
		})
	})

	test("rejects from after to", () => {
		expect(parse("?from=2026-11-25&to=2026-11-24")).toMatchObject({
			ok: false,
			error: { code: "INVALID_RANGE" },
		})
	})

	test("rejects a plan outside the plan table", () => {
		expect(parse("?plan=nope")).toMatchObject({ ok: false, error: { code: "PLAN_UNKNOWN" } })
	})

	test("rejects an empty model", () => {
		expect(parse("?model=")).toMatchObject({ ok: false, error: { code: "INVALID_MODEL" } })
	})
})
