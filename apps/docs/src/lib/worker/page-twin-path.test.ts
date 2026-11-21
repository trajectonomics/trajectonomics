import { describe, expect, test } from "bun:test"
import { pageTwinPath } from "./page-twin-path"

// Only a page URL negotiates. The old `/docs` prefix is a redirect, and a path without a
// trailing slash is not a page URL (ADR 0010, ADR 0013).
const cases: readonly (readonly [string, string | null])[] = [
	["/", "/index.md"],
	["/cli/", "/cli.md"],
	["/cli/commands/tx/", "/cli/commands/tx.md"],
	["/blog/", "/blog.md"],
	["/docs", null],
	["/docs/", null],
	["/docs/cli/", null],
	["/cli", null],
	["/cli/commands/tx.md", null],
	["/llms.txt", null],
	["/sitemap.xml", null],
	["/_astro/app.css", null],
]

describe("a page URL asks for its Markdown twin", () => {
	for (const [pathname, expected] of cases) {
		test(`${pathname} has the twin ${expected ?? "(none)"}`, () => {
			expect(pageTwinPath(pathname)).toBe(expected)
		})
	}
})
