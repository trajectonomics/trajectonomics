import { describe, expect, it } from "bun:test"
import { root } from "./commands"
import { leavesOf } from "./tree"
import { usageOf } from "./usage"

/** The `;`-separated notes one usage line carries, with a repeated note found by equality. */
function repeatedNotes(line: string): string[] {
	const notes = line.split(/;\s+/).map((note) => note.trim())
	return notes.filter((note, index) => note !== "" && notes.indexOf(note) !== index)
}

describe("usage notes", () => {
	it("never repeats a note on one usage line, for every command", () => {
		for (const { path, leaf } of leavesOf(root)) {
			for (const line of usageOf(leaf, path).split("\n")) {
				expect({ path: path.join(" "), line, repeated: repeatedNotes(line) }).toMatchObject({
					repeated: [],
				})
			}
		}
	})

	it("says a repeatable flag is repeatable once, whether or not its description already says so", () => {
		const leaf = leavesOf(root).find(({ path }) => path.join(" ") === "projection run")
		if (leaf === undefined) throw new Error("projection run is not in the tree")
		const setLine = usageOf(leaf.leaf, leaf.path)
			.split("\n")
			.find((line) => line.includes("--set <string>"))
		expect(setLine?.match(/repeatable/g)).toHaveLength(1)
	})
})
