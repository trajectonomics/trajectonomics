import { describe, expect, test } from "bun:test"
import { SITE_ORIGIN } from "../site"
import { twinUrl } from "./twin-url"

const ORIGIN = SITE_ORIGIN

describe("the absolute URL of a page's Markdown twin", () => {
	test.each([
		["/docs/cli", `${ORIGIN}/docs/cli.md`],
		["/docs/cli/installation", `${ORIGIN}/docs/cli/installation.md`],
		["/docs/cli/commands/tx", `${ORIGIN}/docs/cli/commands/tx.md`],
		["/docs/", `${ORIGIN}/docs/index.md`],
	])("the twin of %s is %s", (pageUrl, url) => {
		expect(twinUrl(ORIGIN, pageUrl)).toBe(url)
	})
})
