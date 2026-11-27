import { describe, expect, test } from "bun:test"
import { PORTAL_ORIGIN, SITE_ORIGIN } from "../site"
import { absoluteDocsLinks } from "./absolute-links"

const ORIGIN = SITE_ORIGIN

describe("the links in a Markdown twin", () => {
	test.each([
		["[Commands](/cli/commands/)", `[Commands](${PORTAL_ORIGIN}/cli/commands/)`],
		[
			'[tx](/cli/commands/tx/?a=1#flags "The tx page")',
			`[tx](${PORTAL_ORIGIN}/cli/commands/tx/?a=1#flags "The tx page")`,
		],
		["[Docs](/)", `[Docs](${SITE_ORIGIN}/)`],
		["[Blog](/blog/launch/)", `[Blog](${SITE_ORIGIN}/blog/launch/)`],
		["[Data](/data/)", `[Data](${SITE_ORIGIN}/data/)`],
	])("an internal link is made absolute: %s", (content, expected) => {
		expect(absoluteDocsLinks(content, ORIGIN)).toBe(expected)
	})

	test("a link that already carries the base is not prefixed twice", () => {
		expect(absoluteDocsLinks("[Commands](/docs/cli/commands/)", ORIGIN)).toBe(
			`[Commands](${PORTAL_ORIGIN}/cli/commands/)`,
		)
	})

	test("an external link is untouched", () => {
		const content = "[ledger](https://www.npmjs.com/package/@trajectonomics/ledger)"
		expect(absoluteDocsLinks(content, ORIGIN)).toBe(content)
	})

	test("a link already absolute is left as it is", () => {
		const content = `[tx](${PORTAL_ORIGIN}/cli/commands/tx.md)`
		expect(absoluteDocsLinks(content, ORIGIN)).toBe(content)
	})
})
