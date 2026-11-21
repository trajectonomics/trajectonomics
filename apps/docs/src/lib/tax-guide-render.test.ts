import { describe, expect, test } from "bun:test"
import { REPOSITORY_BLOB_URL, renderTaxGuidePage } from "./tax-guide"

const SOURCE_PATH = "packages/core/tax/CONTRIBUTING.md"

describe("rendering the tax guide page", () => {
	test("makes a relative link into a GitHub URL on main, relative to the guide's folder", () => {
		const page = renderTaxGuidePage(
			"# Title\n\nSee [the table](./references/SOURCES.md) and [a file](src/th/parameters.ts).\n",
			SOURCE_PATH,
		)
		expect(page).toContain(
			`[the table](${REPOSITORY_BLOB_URL}packages/core/tax/references/SOURCES.md)`,
		)
		expect(page).toContain(`[a file](${REPOSITORY_BLOB_URL}packages/core/tax/src/th/parameters.ts)`)
	})

	test("leaves anchors, URLs and absolute paths as they are", () => {
		const body = "[up](#top) [rd](https://www.rd.go.th/) [site](/docs/contribute/)"
		expect(renderTaxGuidePage(`# T\n\n${body}\n`, SOURCE_PATH)).toContain(body)
	})

	test("drops the guide's own title line and keeps the rest of its text", () => {
		const page = renderTaxGuidePage("# T\n\nFirst line.\n", SOURCE_PATH)
		expect(page.endsWith("\nFirst line.\n")).toBe(true)
		expect(page).not.toContain("# T\n")
	})
})
