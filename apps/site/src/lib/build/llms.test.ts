import { describe, expect, it } from "bun:test"
import { LLMS_FILE, LLMS_TXT } from "../crawl/llms"
import { LLMS_FULL_FILE, LLMS_FULL_TXT } from "../crawl/llms-full"
import { OWNER_WRITTEN_PLACEHOLDER } from "../language/dictionary"
import { ABSOLUTE_CLEAN_URL } from "../language/languages"
import { SITE_ORIGIN } from "../site"
import type { BuiltFile } from "./built-files"
import { checkLlmsFiles } from "./llms"

/** Both Answer engine files as a healthy build writes them. */
const FILES: readonly BuiltFile[] = [
	{ path: LLMS_FILE, content: LLMS_TXT },
	{ path: LLMS_FULL_FILE, content: LLMS_FULL_TXT },
]

/** The files with one of them replaced, or dropped when `content` is absent. */
function built(path: string, content?: string): readonly BuiltFile[] {
	return FILES.flatMap((file) => {
		if (file.path !== path) return [file]
		return content === undefined ? [] : [{ path, content }]
	})
}

/** The failure codes one build reports, so a test names the condition. */
function codes(files: readonly BuiltFile[]): readonly string[] {
	return checkLlmsFiles(files).map((failure) => failure.code)
}

describe("the Answer engine files of the host", () => {
	it("passes the two files the build writes", () => {
		expect(codes(FILES)).toEqual([])
	})

	for (const name of [LLMS_FILE, LLMS_FULL_FILE]) {
		it(`fails a build that produced no ${name}`, () => {
			expect(codes(built(name))).toEqual(["LLMS_FILE_MISSING"])
		})
	}

	it("fails a file that still carries the owner's placeholder", () => {
		expect(codes(built(LLMS_FILE, `${LLMS_TXT}${OWNER_WRITTEN_PLACEHOLDER}`))).toEqual([
			"LLMS_PLACEHOLDER_PRESENT",
		])
	})

	it("fails the short file that links no address", () => {
		const withoutHome = LLMS_TXT.replaceAll(`](${ABSOLUTE_CLEAN_URL})`, "")
		expect(codes(built(LLMS_FILE, withoutHome))).toEqual(["LLMS_HOME_MISSING"])
	})

	it("fails the short file that links a Language build path instead of the address", () => {
		const withThai = `${LLMS_TXT}- [ไทย](${SITE_ORIGIN}/th/)\n`
		expect(codes(built(LLMS_FILE, withThai))).toEqual(["LLMS_BUILD_PATH_PRESENT"])
	})

	it("passes the full file whether or not it names a home, because that is the short file's job", () => {
		expect(codes(built(LLMS_FULL_FILE, "# trajectonomics\n"))).toEqual([])
	})
})
