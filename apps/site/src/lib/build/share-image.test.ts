import { describe, expect, it } from "bun:test"
import { LANGUAGES } from "../language/languages"
import { SHARE_IMAGE_HEIGHT, SHARE_IMAGE_WIDTH } from "../social/layout"
import { shareImagePath } from "../social/share-advert"
import { SHARE_IMAGE_MAX_BYTES } from "../social/share-image"
import type { BuiltFile } from "./built-files"
import { checkShareImage } from "./share-image"

/** The size a large card is cut at, which every built share image must state. */
const CARD = Object.freeze({ width: SHARE_IMAGE_WIDTH, height: SHARE_IMAGE_HEIGHT })

/** The share images a healthy build writes, with any given file standing in for one of them. */
function files(...replace: readonly BuiltFile[]): readonly BuiltFile[] {
	return LANGUAGES.map((entry) => {
		const path = shareImagePath(entry.language)
		const healthy: BuiltFile = { path, content: "", bytes: 40_000, pixels: CARD }
		return replace.find((given) => given.path === path) ?? healthy
	})
}

/** The failure codes the check reports for the files given. */
function codes(given: readonly BuiltFile[]): readonly string[] {
	return checkShareImage(given).map((failure) => failure.code)
}

describe("the share image a Language home advertises", () => {
	it("passes a build whose two images are the card's size and light enough", () => {
		expect(codes(files())).toEqual([])
	})

	it("fails a build that wrote one Language's image and not the other", () => {
		const missing = shareImagePath(LANGUAGES[1]?.language ?? "")
		expect(codes(files().filter((file) => file.path !== missing))).toEqual(["SHARE_IMAGE_MISSING"])
	})

	it("fails a file that is not a PNG", () => {
		const path = shareImagePath(LANGUAGES[0]?.language ?? "")
		expect(codes(files({ path, content: "", bytes: 40_000 }))).toEqual(["SHARE_IMAGE_NOT_PNG"])
	})

	it("fails an image cut at another size than the card", () => {
		const path = shareImagePath(LANGUAGES[0]?.language ?? "")
		expect(
			codes(files({ path, content: "", bytes: 40_000, pixels: { width: 600, height: 315 } })),
		).toEqual(["SHARE_IMAGE_SIZE_WRONG"])
	})

	it("fails an image a crawler fetches above the byte ceiling", () => {
		const path = shareImagePath(LANGUAGES[0]?.language ?? "")
		expect(
			codes(files({ path, content: "", bytes: SHARE_IMAGE_MAX_BYTES + 1, pixels: CARD })),
		).toEqual(["SHARE_IMAGE_TOO_HEAVY"])
	})

	it("names the size the image states and the size the card is cut at", () => {
		const path = shareImagePath(LANGUAGES[0]?.language ?? "")
		const [failure] = checkShareImage(
			files({ path, content: "", bytes: 40_000, pixels: { width: 1200, height: 600 } }),
		)
		expect(failure?.path).toBe(path)
		expect(failure?.message).toContain("1200 × 600")
		expect(failure?.message).toContain("1200 × 630")
	})
})
