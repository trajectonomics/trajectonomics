import { describe, expect, test } from "bun:test"
import { pageTwinPath } from "./page-twin-path"

// Only a page URL under the Portal's /docs base negotiates, and only with its trailing slash
// (ADR 0010, ADR 0017). A file, the Site root and the base itself are not page URLs.
const cases: readonly (readonly [string, string | null])[] = [
	["/docs/", "/docs/index.md"],
	["/docs/cli/", "/docs/cli.md"],
	["/docs/cli/commands/tx/", "/docs/cli/commands/tx.md"],
	["/", null],
	["/cli/", null],
	["/blog/", null],
	["/data/", null],
	["/docs", null],
	["/docs/cli", null],
	["/docs/cli/commands/tx.md", null],
	["/docs/llms.txt", null],
	["/docs/sitemap.xml", null],
	["/docs/_astro/app.css", null],
]

describe("a page URL asks for its Markdown twin", () => {
	for (const [pathname, expected] of cases) {
		test(`${pathname} has the twin ${expected ?? "(none)"}`, () => {
			expect(pageTwinPath(pathname)).toBe(expected)
		})
	}
})
