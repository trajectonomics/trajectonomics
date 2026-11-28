import { describe, expect, test } from "bun:test"
import { taxLabelsHref } from "./tax-label-notice.svelte.js"

describe("the Tax labels page a notice links to", () => {
	test("keeps the rest of the current query, and names the plan once", () => {
		expect(taxLabelsHref("?scenario=shared-360&terms=today", "shared-360")).toBe(
			"/settings/tax/?scenario=shared-360&terms=today",
		)
	})

	test("names the plan even when the page's query does not", () => {
		expect(taxLabelsHref("", "a b&c")).toBe("/settings/tax/?scenario=a+b%26c")
	})
})
