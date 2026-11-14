import { describe, expect, it } from "bun:test"
import { sublineParts } from "./subline"

describe("the parts of a sub-line", () => {
	it("marks the command name traj as code, between its sentences", () => {
		expect(sublineParts("Tell your agent what you earn. traj keeps the books.")).toEqual([
			{ text: "Tell your agent what you earn. ", code: false },
			{ text: "traj", code: true },
			{ text: " keeps the books.", code: false },
		])
	})

	it("leaves the rest of the word trajectonomics as text, not code", () => {
		expect(sublineParts("trajectonomics is the Site.")).toEqual([
			{ text: "trajectonomics is the Site.", code: false },
		])
	})

	it("leaves the owner's placeholder as one text run", () => {
		expect(sublineParts("[OWNER TO WRITE]")).toEqual([{ text: "[OWNER TO WRITE]", code: false }])
	})
})
