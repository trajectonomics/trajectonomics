import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"

import OverrideList from "./OverrideList.svelte"

const OVERRIDES = [
	{ path: "income.salary.monthly", display: '"95000.00"', sensitive: true },
	{ path: "flows.rent.enabled", display: "false", sensitive: false },
]

describe("OverrideList", () => {
	test("shows each applied Override's path and value", () => {
		const { body } = render(OverrideList, { props: { overrides: OVERRIDES, hidden: false } })
		expect(body).toContain("income.salary.monthly")
		expect(body).toContain("95000.00")
		expect(body).toContain("flows.rent.enabled")
		expect(body).toContain("false")
	})

	test("masks an Override that may be money when amounts are hidden, and keeps the others", () => {
		const { body } = render(OverrideList, { props: { overrides: OVERRIDES, hidden: true } })
		expect(body).not.toContain("95000.00")
		expect(body).toContain("•••••")
		expect(body).toContain("income.salary.monthly")
		expect(body).toContain("false")
	})

	test("says there are no Overrides when none were applied", () => {
		const { body } = render(OverrideList, { props: { overrides: [], hidden: false } })
		expect(body).toContain("No Overrides")
	})
})
