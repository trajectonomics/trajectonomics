import { describe, expect, it } from "bun:test"
import { z } from "zod"
import { type Io, run } from "./cli"
import { defineCommand, defineGroup } from "./command"
import type { RunRecord } from "./telemetry/event"
import { capture } from "./test-support"
import { fixtureRoot } from "./test-tree"

/** Runs a command line with an observer, and returns the exit code and every record it was given. */
async function observed(
	argv: string[],
	env: Record<string, string | undefined> = {},
): Promise<{ code: number; records: RunRecord[] }> {
	const records: RunRecord[] = []
	const io: Io = { out: () => {}, err: () => {}, observe: (record) => records.push(record) }
	const code = await run(argv, io, env, fixtureRoot)
	return { code, records }
}

describe("run reports what ran", () => {
	it("reports the leaf and the success, once", async () => {
		const { code, records } = await observed(["demo", "echo", "hi", "--json"])
		expect(code).toBe(0)
		expect(records).toEqual([{ command: "demo echo", exitCode: 0, format: "json" }])
	})

	it("reports a built-in as the command that ran", async () => {
		const { records } = await observed(["version"])
		expect(records).toEqual([{ command: "version", exitCode: 0, format: "human" }])
	})

	it("reports the leaf and the error code of a failed input", async () => {
		const { code, records } = await observed(["demo", "echo", "--json", "--nope"])
		expect(code).toBe(2)
		expect(records).toEqual([
			{ command: "demo echo", exitCode: 2, errorCode: "unknown_flag", format: "json" },
		])
	})

	it("names no command when the words do not reach a leaf", async () => {
		const { records } = await observed(["nope", "--json"])
		expect(records).toEqual([
			{ command: undefined, exitCode: 2, errorCode: "unknown_command", format: "json" },
		])
	})

	it("names no command for a group named with nothing under it", async () => {
		const { records } = await observed(["demo"])
		expect(records[0]?.command).toBeUndefined()
		expect(records[0]?.errorCode).toBe("invalid_input")
	})

	it("reports a bad format in human, once, with its error code", async () => {
		const { code, records } = await observed(["version"], { TRAJ_FORMAT: "yaml" })
		expect(code).toBe(2)
		expect(records).toEqual([
			{ command: "version", exitCode: 2, errorCode: "unknown_format", format: "human" },
		])
	})

	it("reports the internal catch-all when a command throws", async () => {
		const boom = defineCommand({
			name: "boom",
			summary: "Throw",
			positionals: [],
			input: z.strictObject({}),
			output: z.null(),
			examples: [],
			errorCodes: [],
			run: () => {
				throw new Error("unexpected")
			},
		})
		const root = defineGroup({ name: "traj", summary: "t", children: [boom] })
		const records: RunRecord[] = []
		const code = await run(
			["boom", "--json"],
			{
				out: () => {},
				err: () => {},
				observe: (record) => records.push(record),
			},
			{},
			root,
		)
		expect(code).toBe(1)
		expect(records).toEqual([
			{ command: "boom", exitCode: 1, errorCode: "internal", format: "json" },
		])
	})

	it("keeps working with no observer, as the tests do", async () => {
		const res = await capture(["version", "--json"])
		expect(res.code).toBe(0)
	})
})
