import { describe, expect, test } from "bun:test"
import { parseHourlyQuery } from "../src/core/hourly-query"
import { NOW_MS } from "./support/fixtures"

function parse(search: string) {
	return parseHourlyQuery(
		new URL(`https://trajectonomics.com/data/api/usage/hourly${search}`),
		NOW_MS,
	)
}

describe("parseHourlyQuery", () => {
	test("defaults an unnamed window to today", () => {
		expect(parse("")).toEqual({
			ok: true,
			query: { from: "2026-11-25", to: "2026-11-25", asOf: "2026-11-25" },
		})
	})

	test("reads the inclusive day window it is given", () => {
		expect(parse("?from=2026-11-19&to=2026-11-25")).toEqual({
			ok: true,
			query: { from: "2026-11-19", to: "2026-11-25", asOf: "2026-11-25" },
		})
	})

	test("asOf caps a later to and becomes the default from", () => {
		expect(parse("?to=2026-11-25&asOf=2026-11-20")).toEqual({
			ok: true,
			query: { from: "2026-11-20", to: "2026-11-20", asOf: "2026-11-20" },
		})
	})

	test("never widens a to that is earlier than asOf", () => {
		const result = parse("?from=2026-11-19&to=2026-11-20&asOf=2026-11-24")
		expect(result.ok).toBe(true)
		if (result.ok) expect(result.query.to).toBe("2026-11-20")
	})

	test("allows seven inclusive days and rejects eight", () => {
		expect(parse("?from=2026-11-19&to=2026-11-25").ok).toBe(true)
		expect(parse("?from=2026-11-18&to=2026-11-25")).toMatchObject({
			ok: false,
			error: { code: "INVALID_RANGE" },
		})
	})

	test("rejects from after to", () => {
		expect(parse("?from=2026-11-25&to=2026-11-24")).toMatchObject({
			ok: false,
			error: { code: "INVALID_RANGE" },
		})
	})

	test("rejects a day that is not a real calendar day or is out of bounds", () => {
		expect(parse("?from=2026-02-31")).toMatchObject({
			ok: false,
			error: { code: "INVALID_DATE" },
		})
		expect(parse("?to=2026-11-27")).toMatchObject({
			ok: false,
			error: { code: "INVALID_DATE" },
		})
	})
})
