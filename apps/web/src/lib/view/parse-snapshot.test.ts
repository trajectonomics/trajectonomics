import { describe, expect, test } from "bun:test"
import { demoSnapshotJson } from "../../../scripts/demo-snapshot"
import { parseSnapshotText } from "./parse-snapshot"

describe("a Snapshot written before the chance reads", () => {
	test("parses a Snapshot with no chance key to chance = {}, as the origin/main shape does", async () => {
		const json = (await demoSnapshotJson()) as { reads: Record<string, unknown> }
		const { chance: _omitted, ...reads } = json.reads
		const result = parseSnapshotText(JSON.stringify({ ...json, reads }))
		expect(result.ok).toBe(true)
		if (result.ok) expect(result.snapshot.reads.chance).toEqual({})
	})
})
