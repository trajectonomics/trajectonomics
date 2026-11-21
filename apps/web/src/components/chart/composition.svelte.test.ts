import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import CompositionBar from "./CompositionBar.svelte"
import Sparkline from "./Sparkline.svelte"

describe("CompositionBar", () => {
	const segments = [
		{ label: "Bank", amount: "606000.00", value: 606000 },
		{ label: "Fund", amount: "660000.00", value: 660000 },
	]

	test("lists each part with its CLI amount and states no computed share", () => {
		const { body } = render(CompositionBar, {
			props: { label: "Assets by account", segments, currency: "THB", hidden: false },
		})
		expect(body).toContain("606,000.00")
		expect(body).toContain("THB")
		expect(body).not.toContain("%")
	})

	test("hides each amount while keeping the labels", () => {
		const { body } = render(CompositionBar, {
			props: { label: "Assets by account", segments, hidden: true },
		})
		expect(body).not.toContain("606,000.00")
		expect(body).toContain("Bank")
	})

	test("is an image with its label and a 2 px gap between segments", () => {
		const { body } = render(CompositionBar, {
			props: { label: "Assets by account", segments, hidden: false },
		})
		expect(body).toContain('role="img"')
		expect(body).toContain("gap-[2px]")
	})
})

describe("Sparkline", () => {
	test("is an image with its label and a path through its values", () => {
		const { body } = render(Sparkline, { props: { label: "Net worth", values: [1, 3, 2] } })
		expect(body).toContain('aria-label="Net worth"')
		expect(body).toContain('d="M0 32 L60 0 L120 16"')
	})
})
