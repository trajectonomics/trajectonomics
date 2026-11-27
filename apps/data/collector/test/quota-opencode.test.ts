import { describe, expect, test } from "bun:test"
import { parseOpenCodeQuota } from "../src/quota/parse"

const SAMPLED_AT = "2026-11-27T14:00:00.000Z"

describe("parseOpenCodeQuota", () => {
	test("maps rolling, weekly and monthly windows", () => {
		const rows = parseOpenCodeQuota(
			{
				usage: {
					rolling: { status: "ok", percent: 4, resetsAt: "2026-11-27T14:26:54.000Z" },
					weekly: { status: "ok", percent: 55, resetsAt: "2026-11-30T00:00:00.000Z" },
					monthly: { status: "ok", percent: 27, resetsAt: "2026-12-25T11:51:02.000Z" },
				},
			},
			SAMPLED_AT,
		)
		expect(rows).toEqual([
			{
				contributor: "trajectonomics",
				plan: "opencode-go",
				window: "five_hour",
				sampledAt: SAMPLED_AT,
				usedPct: 4,
				resetsAt: "2026-11-27T14:26:54.000Z",
			},
			{
				contributor: "trajectonomics",
				plan: "opencode-go",
				window: "weekly",
				sampledAt: SAMPLED_AT,
				usedPct: 55,
				resetsAt: "2026-11-30T00:00:00.000Z",
			},
			{
				contributor: "trajectonomics",
				plan: "opencode-go",
				window: "monthly",
				sampledAt: SAMPLED_AT,
				usedPct: 27,
				resetsAt: "2026-12-25T11:51:02.000Z",
			},
		])
	})

	test("skips a null window", () => {
		const rows = parseOpenCodeQuota(
			{
				usage: {
					rolling: null,
					weekly: { percent: 55, resetsAt: null },
					monthly: { percent: 27, resetsAt: null },
				},
			},
			SAMPLED_AT,
		)
		expect(rows?.map((row) => row.window)).toEqual(["weekly", "monthly"])
	})

	test("rejects a body with a malformed window", () => {
		expect(parseOpenCodeQuota({ usage: { rolling: { percent: "4" } } }, SAMPLED_AT)).toBeNull()
		expect(parseOpenCodeQuota({ usage: {} }, SAMPLED_AT)).toBeNull()
		expect(parseOpenCodeQuota({}, SAMPLED_AT)).toBeNull()
		expect(parseOpenCodeQuota(null, SAMPLED_AT)).toBeNull()
	})

	test("rejects a percentage outside 0 to 100", () => {
		const body = { usage: { rolling: { percent: -1 }, weekly: null, monthly: null } }
		expect(parseOpenCodeQuota(body, SAMPLED_AT)).toBeNull()
	})
})
