import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"

import { OverrideList } from "./StatementParts"

const OVERRIDES = [
	{ path: "income.salary.monthly", display: '"95000.00"', sensitive: true },
	{ path: "flows.rent.enabled", display: "false", sensitive: false },
]

describe("OverrideList", () => {
	test("shows each applied Override's path and value", () => {
		const html = renderToStaticMarkup(<OverrideList overrides={OVERRIDES} hidden={false} />)
		expect(html).toContain("income.salary.monthly")
		expect(html).toContain("95000.00")
		expect(html).toContain("flows.rent.enabled")
		expect(html).toContain("false")
	})

	test("masks an Override that may be money when amounts are hidden, and keeps the others", () => {
		const html = renderToStaticMarkup(<OverrideList overrides={OVERRIDES} hidden />)
		expect(html).not.toContain("95000.00")
		expect(html).toContain("•••••")
		expect(html).toContain("income.salary.monthly")
		expect(html).toContain("false")
	})

	test("says there are no Overrides when none were applied", () => {
		const html = renderToStaticMarkup(<OverrideList overrides={[]} hidden={false} />)
		expect(html).toContain("No Overrides")
	})
})
