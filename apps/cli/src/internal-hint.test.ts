import { describe, expect, it } from "bun:test"
import { z } from "zod"
import { defineCommand, defineGroup } from "./command"
import { fail } from "./errors"
import { capture, errorOf } from "./test-support"

const REPORT_URL = "https://github.com/trajectonomics/trajectonomics/issues/new/choose"

const crash = defineCommand({
	name: "crash",
	summary: "Fail with an error no command expects",
	positionals: [],
	input: z.strictObject({}),
	output: z.null(),
	examples: [],
	errorCodes: [],
	run: () => {
		throw new Error("boom")
	},
})

const root = defineGroup({ name: "traj", summary: "crash tree", children: [crash] })

describe("an internal failure", () => {
	it("names the issue chooser where it is reported, at exit 1", () => {
		const body = fail("internal").body
		expect(body.code).toBe("internal")
		expect(body.exitCode).toBe(1)
		expect(body.hint).toContain(REPORT_URL)
	})

	it("carries that pointer in the JSON envelope of a command that throws", async () => {
		const res = await capture(["crash", "--json"], {}, root)
		expect(res.code).toBe(1)
		expect(errorOf(res)).toMatchObject({
			code: "internal",
			exitCode: 1,
			hint: expect.stringContaining(REPORT_URL),
		})
	})

	it("prints the pointer as a hint line on stderr in text output", async () => {
		const res = await capture(["crash"], {}, root)
		expect(res.code).toBe(1)
		expect(res.err).toContain("error: internal: Unexpected internal error.")
		expect(res.err).toContain(`hint: Report it at ${REPORT_URL}`)
	})
})

describe("a domain failure", () => {
	it("keeps no hint of its own when its command gave none, even at exit 1", () => {
		expect(fail("database_corrupt").body.hint).toBeUndefined()
	})

	it("keeps the hint its command gave, not the internal pointer", () => {
		expect(fail("invalid_input", { hint: "Name one account." }).body.hint).toBe("Name one account.")
	})
})
