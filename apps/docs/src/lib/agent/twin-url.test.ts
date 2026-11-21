import { describe, expect, test } from "bun:test"
import { SITE_ORIGIN } from "../site"
import { twinUrl } from "./twin-url"

const ORIGIN = SITE_ORIGIN

describe("the absolute URL of a page's Markdown twin", () => {
	test.each([
		["/cli", "https://docs.trajectonomics.com/cli.md"],
		["/cli/installation", "https://docs.trajectonomics.com/cli/installation.md"],
		["/cli/commands/tx", "https://docs.trajectonomics.com/cli/commands/tx.md"],
		["/", "https://docs.trajectonomics.com/index.md"],
	])("the twin of %s is %s", (pageUrl, url) => {
		expect(twinUrl(ORIGIN, pageUrl)).toBe(url)
	})
})
