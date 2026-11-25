import { describe, expect, test } from "bun:test"
import { type Snapshot, snapshot } from "../src/lib/contract"
import { isWarningNote } from "../src/lib/view/overview/warning-notes"
import { demoSnapshotJson } from "./demo-snapshot"

describe("the Demo's real FI notes", () => {
	test("count the CLI's 'could not be funded' note as a warning the hero shows", async () => {
		const parsed: Snapshot = snapshot.parse(await demoSnapshotJson())
		const notes = Object.values(parsed.reads.fi).flatMap((read) => (read.ok ? read.data.notes : []))
		const unfunded = notes.filter((note) => note.includes("could not be funded"))
		expect(unfunded.length).toBeGreaterThan(0)
		expect(unfunded.every(isWarningNote)).toBe(true)
	})
})
