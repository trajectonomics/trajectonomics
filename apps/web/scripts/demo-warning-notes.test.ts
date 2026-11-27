import { describe, expect, test } from "bun:test"
import { type Read, type Snapshot, snapshot } from "../src/lib/contract"
import { isWarningNote } from "../src/lib/view/overview/warning-notes"
import { demoSnapshotJson } from "./demo-snapshot"

/** The CLI's success sentence, which Home's answer never quotes below the chart (web ADR 0001). */
const SUCCESS_NOTE = /^The plan holds to /

/** The notes a Read states, or none when it did not answer. */
function notesOf(read: Read<{ notes: string[] }> | null | undefined): string[] {
	if (read === null || read === undefined || !read.ok) return []
	return read.data.notes
}

/** Asserts a chance read states the CLI's success sentence, and the hero does not count it as a warning. */
function expectSuccess(plan: string, notes: readonly string[]): void {
	expect(notes, `${plan}: the CLI's success note`).toContainEqual(
		expect.stringMatching(SUCCESS_NOTE),
	)
	expect(notes.filter(isWarningNote), `${plan}: no warning note`).not.toContainEqual(
		expect.stringMatching(SUCCESS_NOTE),
	)
}

/** Asserts the notes state the CLI's sentence `pattern`, and the hero counts every one of them. */
function expectWarnings(notes: readonly string[], pattern: RegExp): void {
	const stated = notes.filter((note) => pattern.test(note))
	expect(notes).toContainEqual(expect.stringMatching(pattern))
	expect(stated.filter(isWarningNote)).toEqual(stated)
}

describe("the Demo's real notes", () => {
	test("state the CLI's success sentence in every good chance read, and never as a warning", async () => {
		const parsed: Snapshot = snapshot.parse(await demoSnapshotJson())
		const good = Object.entries(parsed.reads.chance).filter(([, read]) => read.ok)
		expect(good.map(([plan]) => plan)).toEqual(Object.keys(parsed.reads.fi))
		for (const [plan, read] of good) expectSuccess(plan, notesOf(read))
	})

	test("count the CLI's 'could not be funded' note as a warning the hero shows", async () => {
		const parsed: Snapshot = snapshot.parse(await demoSnapshotJson())
		const notes = Object.values(parsed.reads.fi).flatMap((read) => notesOf(read))
		expectWarnings(notes, /could not be funded/)
	})

	test("count the CLI's 'could not fund' note from a Comparison as a warning the hero shows", async () => {
		const parsed: Snapshot = snapshot.parse(await demoSnapshotJson())
		expectWarnings(notesOf(parsed.reads.compare), /could not fund/)
	})
})
