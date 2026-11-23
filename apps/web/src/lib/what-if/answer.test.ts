import { describe, expect, test } from "bun:test"
import type { ErrorBody } from "../contract"
import {
	failedReads,
	namesChange,
	pathNamed,
	unplacedRefusals,
	type WhatIfAnswer,
	whatIfAnswer,
} from "./answer"
import { startWhatIf, switchedOff, withSet } from "./session"

const OK_READ = { argv: ["fi"], ok: true, data: {} }
const FAILED = (message: string, details?: unknown) => ({
	argv: ["projection", "run"],
	ok: false,
	error: { code: "invalid_input", exitCode: 2, message, details },
})

function answer(projection: unknown, compare: unknown = OK_READ): WhatIfAnswer {
	return whatIfAnswer.parse({
		ok: true,
		reads: { projection, fi: OK_READ, compare, chance: null },
	})
}

describe("the what-if answer", () => {
	test("a refused request is an error envelope, and it has no failed reads", () => {
		const refused = whatIfAnswer.parse({
			ok: false,
			error: { code: "invalid_what_if", exitCode: 1, message: "bad" },
		})
		expect(failedReads(refused)).toEqual([])
	})

	test("the failed reads are named in order, and a read that held has none", () => {
		const failed = answer(
			FAILED("no such flow", { path: "flows.nope.amount" }),
			FAILED("no compare"),
		)
		expect(failedReads(failed).map((entry) => entry.read)).toEqual(["projection", "compare"])
	})

	test("a path the refusal names is read from its details, and a refusal with none names no change", () => {
		expect(pathNamed(FAILED("x", { path: "flows.gym" }).error)).toBe("flows.gym")
		expect(pathNamed(FAILED("x", { index: 0 }).error)).toBeNull()
		expect(pathNamed(FAILED("x").error)).toBeNull()
	})

	test("a refusal names the change of the session it refers to, and only a change the session holds", () => {
		const error = FAILED("x", { path: "flows.gym" }).error as ErrorBody
		const session = switchedOff(startWhatIf("base", "jcs1:sha256:x"), "flows.gym")
		expect(namesChange(error, session, "flows.gym")).toBe(true)
		expect(namesChange(error, startWhatIf("base", "jcs1:sha256:x"), "flows.gym")).toBe(false)
		expect(
			namesChange(error, withSet(session, "flows.salary.amount", "1"), "flows.salary.amount"),
		).toBe(false)
	})

	test("a refusal that names no change is shown once on its own line, however many reads hold it", () => {
		const session = switchedOff(startWhatIf("base", "jcs1:sha256:x"), "flows.gym")
		const busy = FAILED("The database is busy.")
		const mixed = whatIfAnswer.parse({
			ok: true,
			reads: {
				projection: busy,
				fi: busy,
				compare: FAILED("no such flow", { path: "flows.gym" }),
				chance: FAILED("Currency is not supported.", { currency: "XXX" }),
			},
		})
		expect(unplacedRefusals(mixed, session)).toEqual([
			"The database is busy.",
			"Currency is not supported.",
		])
		expect(unplacedRefusals(null, session)).toEqual([])
	})
})
