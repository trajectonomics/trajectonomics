import { describe, expect, test } from "bun:test"
import { twinPath } from "./twin-path"

describe("the path of a page's Markdown twin", () => {
	test.each([
		["/cli/commands/tx", "/cli/commands/tx.md"],
		["/cli/commands/tx/", "/cli/commands/tx.md"],
		["/cli/installation", "/cli/installation.md"],
	])(
		"the twin of %s is %s, its path with `.md` in place of the trailing slash",
		(pageUrl, twin) => {
			expect(twinPath(pageUrl)).toBe(twin)
		},
	)

	test.each([
		["/cli", "/cli.md"],
		["/cli/", "/cli.md"],
		["/cli/commands", "/cli/commands.md"],
	])("the twin of the folder index page %s is %s, never an index path", (pageUrl, twin) => {
		expect(twinPath(pageUrl)).toBe(twin)
	})

	test.each([["/", "/index.md"]])("the twin of the Landing Page %s is %s", (pageUrl, twin) => {
		expect(twinPath(pageUrl)).toBe(twin)
	})
})
