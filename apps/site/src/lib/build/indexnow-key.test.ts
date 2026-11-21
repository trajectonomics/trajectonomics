import { describe, expect, it } from "bun:test"
import { INDEXNOW_KEY, INDEXNOW_KEY_FILE } from "../crawl/indexnow"
import type { BuiltFile } from "./built-files"
import { checkIndexNowKey } from "./indexnow-key"

/** The codes one build reports for the key file, `file` standing in for the one the build writes. */
function codes(file?: BuiltFile): readonly string[] {
	return checkIndexNowKey(file === undefined ? [] : [file]).map((failure) => failure.code)
}

/** The key file as a healthy build writes it. */
const HEALTHY: BuiltFile = { path: INDEXNOW_KEY_FILE, content: INDEXNOW_KEY }

describe("the IndexNow key file of the host", () => {
	it("passes a build that serves the key alone, with no newline around it", () => {
		expect(codes(HEALTHY)).toEqual([])
	})

	it("fails a build that produced no key file, which would refuse every ping", () => {
		expect(codes()).toEqual(["INDEXNOW_KEY_FILE_MISSING"])
	})

	it("fails a key file that states anything but the key", () => {
		expect(codes({ path: INDEXNOW_KEY_FILE, content: `${INDEXNOW_KEY}\n\n# site` })).toEqual([
			"INDEXNOW_KEY_FILE_WRONG",
		])
	})

	it("fails a key file carrying another key, which the endpoint would not match", () => {
		expect(codes({ path: INDEXNOW_KEY_FILE, content: "0".repeat(32) })).toEqual([
			"INDEXNOW_KEY_FILE_WRONG",
		])
	})
})
