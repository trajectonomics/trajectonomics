import { describe, expect, test } from "bun:test"
import { editSchema, singleWriteEditSchema, writeCommand } from "../../edit/edit"
import { keepEdit } from "./keep"

const HASH = `jcs1:sha256:${"0123456789abcdef".repeat(4)}`

describe("a Keep is a Set of the value as the Read printed it", () => {
	test("a rate stays an integer of basis points", () => {
		const edit = keepEdit("base", HASH, { path: "economy.inflation", value: 250 })
		expect(edit).toEqual({
			kind: "apply-overrides",
			name: "base",
			contentHash: HASH,
			sets: [{ path: "economy.inflation", value: 250 }],
			removals: [],
			additions: [],
		})
		expect(editSchema.safeParse(edit).success).toBe(true)
		expect(writeCommand(singleWriteEditSchema.parse(edit), false).argv).toEqual([
			"scenario",
			"apply",
			"base",
			"--set=economy.inflation=250",
			"--decimal",
			"--if-hash",
			HASH,
			"--json",
		])
	})

	test("an amount stays the CLI's decimal string", () => {
		const edit = keepEdit("base", HASH, { path: "flows.rent.amount", value: "12000.50" })
		expect(writeCommand(singleWriteEditSchema.parse(edit), true).argv).toContain(
			'--set=flows.rent.amount="12000.50"',
		)
	})
})
