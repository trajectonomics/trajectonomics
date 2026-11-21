import { describe, expect, test } from "bun:test"
import { SITE_ORIGIN } from "../site"
import { absoluteDocsLinks } from "./absolute-links"

const ORIGIN = SITE_ORIGIN

describe("the links in a Markdown twin", () => {
	test.each([
		["[Commands](/cli/commands/)", "[Commands](https://docs.trajectonomics.com/cli/commands/)"],
		[
			'[tx](/cli/commands/tx/?a=1#flags "The tx page")',
			'[tx](https://docs.trajectonomics.com/cli/commands/tx/?a=1#flags "The tx page")',
		],
		["[Docs](/)", "[Docs](https://docs.trajectonomics.com/)"],
	])("an internal link is made absolute: %s", (content, expected) => {
		expect(absoluteDocsLinks(content, ORIGIN)).toBe(expected)
	})

	test("an external link is untouched", () => {
		const content = "[ledger](https://www.npmjs.com/package/@trajectonomics/ledger)"
		expect(absoluteDocsLinks(content, ORIGIN)).toBe(content)
	})

	test("a link already absolute is left as it is", () => {
		const content = "[tx](https://docs.trajectonomics.com/cli/commands/tx.md)"
		expect(absoluteDocsLinks(content, ORIGIN)).toBe(content)
	})
})
