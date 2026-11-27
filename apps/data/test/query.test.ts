import { describe, expect, test } from "bun:test"
import { parseUsageQuery } from "../src/core/query"
import { NOW_MS } from "./support/fixtures"

const SERIES = "measured-by-us"

function parse(search: string) {
	return parseUsageQuery(
		new URL(`https://trajectonomics.com/data/api/usage${search}`),
		NOW_MS,
		SERIES,
	)
}

describe("parseUsageQuery", () => {
	test("defaults a missing window to the last 30 days ending today", () => {
		const result = parse("")
		expect(result).toEqual({
			ok: true,
			query: {
				filter: { series: SERIES, from: "2026-10-26", to: "2026-11-25", plan: null, model: null },
				asOf: "2026-11-25",
			},
		})
	})

	test("reads a 30-day window ending today when only from is given", () => {
		const result = parse("?from=2026-11-01")
		expect(result.ok).toBe(true)
		if (!result.ok) return
		expect(result.query.filter).toEqual({
			series: SERIES,
			from: "2026-11-01",
			to: "2026-11-25",
			plan: null,
			model: null,
		})
		expect(result.query.asOf).toBe("2026-11-25")
	})

	test("reads a 30-day window ending at to when only to is given", () => {
		const result = parse("?to=2026-11-20")
		expect(result.ok).toBe(true)
		if (!result.ok) return
		expect(result.query.filter).toEqual({
			series: SERIES,
			from: "2026-10-21",
			to: "2026-11-20",
			plan: null,
			model: null,
		})
		expect(result.query.asOf).toBe("2026-11-25")
	})

	test("reads a 30-day window ending at asOf when only asOf is given", () => {
		const result = parse("?asOf=2026-11-24")
		expect(result.ok).toBe(true)
		if (!result.ok) return
		expect(result.query.filter.from).toBe("2026-10-25")
		expect(result.query.filter.to).toBe("2026-11-24")
		expect(result.query.asOf).toBe("2026-11-24")
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
		expect(result.query.asOf).toBe("2026-11-25")
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

	test("accepts a lowercase model id up to 64 characters", () => {
		expect(parse(`?model=${"a".repeat(64)}`).ok).toBe(true)
		expect(parse("?model=openai/gpt-5.1_x-2").ok).toBe(true)
	})

	test("rejects a model id over 64 characters or outside the lowercase set", () => {
		expect(parse(`?model=${"a".repeat(65)}`)).toMatchObject({
			ok: false,
			error: { code: "INVALID_MODEL" },
		})
		expect(parse("?model=Claude-Opus")).toMatchObject({
			ok: false,
			error: { code: "INVALID_MODEL" },
		})
		expect(parse("?model=a%20b")).toMatchObject({
			ok: false,
			error: { code: "INVALID_MODEL" },
		})
	})

	test("bounds dates to 2020-01-01 through tomorrow", () => {
		expect(parse("?from=2019-12-31")).toMatchObject({
			ok: false,
			error: { code: "INVALID_DATE" },
		})
		expect(parse("?to=2026-11-26").ok).toBe(true)
		expect(parse("?to=2026-11-27")).toMatchObject({
			ok: false,
			error: { code: "INVALID_DATE" },
		})
		expect(parse("?asOf=2019-12-31")).toMatchObject({
			ok: false,
			error: { code: "INVALID_DATE" },
		})
	})

	test("caps the span at 400 days", () => {
		expect(parse("?from=2025-01-01&to=2026-02-05").ok).toBe(true)
		expect(parse("?from=2025-01-01&to=2026-02-06")).toMatchObject({
			ok: false,
			error: { code: "INVALID_RANGE" },
		})
	})

	test("rejects from after the effective upper bound", () => {
		expect(parse("?from=2026-11-20&asOf=2026-11-19")).toMatchObject({
			ok: false,
			error: { code: "INVALID_RANGE" },
		})
	})
})
