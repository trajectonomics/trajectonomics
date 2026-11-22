import { describe, expect, test } from "bun:test"
import { z } from "zod"
import { CONTRACT_MISMATCH, decodeRead } from "./decode-read"

const schema = z.strictObject({ asOf: z.string(), rows: z.array(z.number()) })
const argv = ["balance", "--as-of", "2026-10-31", "--json"]

describe("decoding a successful call", () => {
	test("parses the data the leaf's schema accepts", () => {
		const read = decodeRead(
			argv,
			{ code: 0, stdout: '{"asOf":"2026-10-31","rows":[1]}', stderr: "" },
			schema,
		)
		expect(read).toEqual({ argv, ok: true, data: { asOf: "2026-10-31", rows: [1] } })
	})

	test("names the zod path of a field the schema rejects, under the contract mismatch code", () => {
		const read = decodeRead(
			argv,
			{ code: 0, stdout: '{"asOf":"2026-10-31","rows":["x"]}', stderr: "" },
			schema,
		)
		expect(read.ok).toBe(false)
		if (read.ok) return
		expect(read.error.code).toBe(CONTRACT_MISMATCH)
		expect(read.error.message).toContain("rows.0")
	})

	test("a field the schema does not name is a mismatch, not a silent pass", () => {
		const read = decodeRead(
			argv,
			{ code: 0, stdout: '{"asOf":"x","rows":[],"extra":1}', stderr: "" },
			schema,
		)
		expect(read.ok).toBe(false)
	})

	test("stdout that is not JSON is a contract mismatch", () => {
		const read = decodeRead(argv, { code: 0, stdout: "not json", stderr: "" }, schema)
		expect(read.ok).toBe(false)
		if (read.ok) return
		expect(read.error.code).toBe(CONTRACT_MISMATCH)
	})
})

describe("decoding a failed call", () => {
	test("keeps the CLI's error envelope as it was printed", () => {
		const envelope = {
			error: {
				code: "not_found",
				exitCode: 4,
				message: 'No scenario matches "x".',
				path: "scenario",
				hint: "Run it.",
			},
		}
		const read = decodeRead(argv, { code: 4, stdout: "", stderr: JSON.stringify(envelope) }, schema)
		expect(read).toEqual({ argv, ok: false, error: envelope.error })
	})

	test("text on stderr that is not an envelope keeps its text under the unparsed code", () => {
		const read = decodeRead(argv, { code: 1, stdout: "", stderr: "launcher failed\n" }, schema)
		expect(read).toEqual({
			argv,
			ok: false,
			error: { code: "unparsed_error", exitCode: 1, message: "launcher failed" },
		})
	})

	test("silent failure still names its exit code", () => {
		const read = decodeRead(argv, { code: 2, stdout: "", stderr: "" }, schema)
		expect(read.ok).toBe(false)
		if (read.ok) return
		expect(read.error.message).toBe("traj exited with code 2")
	})
})
