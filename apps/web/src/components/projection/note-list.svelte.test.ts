import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { noteAnchor } from "../../lib/view/projection/notes"
import NoteList from "./NoteList.svelte"

const NOTE = "29603.80 of Contributions could not be funded, so they were not made."

describe("NoteList", () => {
	test("gives a note the id its reader links to, and shows the CLI's words", () => {
		const { body } = render(NoteList, { props: { notes: [NOTE], scenario: "base" } })
		expect(body).toContain(`id="${noteAnchor("base", 0)}"`)
		expect(body).toContain(NOTE)
	})
})
