import { describe, expect, it } from "bun:test"
import { checkOwnerWritten } from "./owner-written"
import { codes, entryAt, home } from "./testing/homes"

describe("the strings only the owner may write", () => {
	it("passes a home that still shows the owner's placeholder", () => {
		expect(codes(checkOwnerWritten)).toEqual([])
	})

	it("fails a home that replaced the placeholder with written text", () => {
		const page = home(entryAt(0).language, "<p>Trajectonomics</p>")
		expect(codes(checkOwnerWritten, page)).toEqual(["OWNER_WRITTEN_MISSING"])
	})
})
