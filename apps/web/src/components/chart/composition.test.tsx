import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"
import { CompositionBar } from "./CompositionBar"
import { Sparkline } from "./Sparkline"

describe("CompositionBar", () => {
	const segments = [
		{ label: "Bank", amount: "606000.00", value: 606000 },
		{ label: "Fund", amount: "660000.00", value: 660000 },
	]

	test("lists each part with its CLI amount and its share", () => {
		const html = renderToStaticMarkup(
			<CompositionBar
				label="Assets by account"
				segments={segments}
				currency="THB"
				hidden={false}
			/>,
		)
		expect(html).toContain("606,000.00")
		expect(html).toContain("THB")
		expect(html).toContain("48%")
		expect(html).toContain("52%")
	})

	test("hides each amount while keeping the labels and the shares", () => {
		const html = renderToStaticMarkup(
			<CompositionBar label="Assets by account" segments={segments} hidden />,
		)
		expect(html).not.toContain("606,000.00")
		expect(html).toContain("Bank")
		expect(html).toContain("52%")
	})

	test("is an image with its label and a 2 px gap between segments", () => {
		const html = renderToStaticMarkup(
			<CompositionBar label="Assets by account" segments={segments} hidden={false} />,
		)
		expect(html).toContain('role="img"')
		expect(html).toContain("gap-[2px]")
	})
})

describe("Sparkline", () => {
	test("is an image with its label and a path through its values", () => {
		const html = renderToStaticMarkup(<Sparkline label="Net worth" values={[1, 3, 2]} />)
		expect(html).toContain('aria-label="Net worth"')
		expect(html).toContain('d="M0 32 L60 0 L120 16"')
	})
})
