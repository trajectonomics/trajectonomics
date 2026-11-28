import { describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import EntryForm from "./EntryForm.svelte"
import RoutingBody from "./RoutingBody.svelte"
import { routedSnapshot } from "./routing.test-support"
import StepForm from "./StepForm.svelte"
import TransferForm from "./TransferForm.svelte"

/** The page's text: its tags dropped and its spaces collapsed, so a sentence reads as the person reads it. */
const text = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ")
const { snapshot, ctx } = routedSnapshot()
const body = (editable = true) =>
	render(RoutingBody, { props: { snapshot, scenario: "base", editable } }).body

describe("the Where money goes page at phone width", () => {
	test("has the four sections, each stacked on a phone and side by side from a wide screen", () => {
		const html = body()
		for (const heading of [
			"When there is money left over",
			"Which savings come first",
			"When money is short",
			"Planned moves between your accounts",
		]) {
			expect(html).toContain(heading)
		}
		expect(html.match(/grid gap-6 [^"]*lg:grid-cols-2/g)).toHaveLength(4)
		expect(html).not.toMatch(/min-w-\[|overflow-x-(scroll|auto)/)
	})

	test("words each row, with the amounts as the document states them", () => {
		const said = text(body())
		expect(said).toContain("up to 300,000.00 THB in today's money")
		expect(said).toMatch(/Put 30% of what is left into/)
		expect(said).toMatch(/Everything else into/)
		expect(said).toMatch(/down to 100,000.00 THB/)
		expect(said).toMatch(/Then the rest of/)
		expect(said).toMatch(/Move all of .* every year, from 30 Jun 2031/)
		expect(said).toContain("The last step must take everything that is left.")
		expect(said).toContain("home or a car")
	})

	test("opens each intro from a disclosure named How this list works, with the words inside it", () => {
		const html = body()
		const summaries = html.match(/<summary[^>]*>How this list works<\/summary>/g) ?? []
		expect(summaries).toHaveLength(4)
		const opened = html.slice(html.indexOf("How this list works"))
		expect(opened.slice(0, opened.indexOf("</details>"))).toContain(
			"The last step must take everything that is left.",
		)
		expect(html).toMatch(/<svg[^>]*viewBox="0 0 10 20"[^>]*aria-hidden="true"/)
	})

	test("has Up and Down for each row, the first Up and the last Down turned off", () => {
		const html = body()
		const ups = html.match(/<button[^>]*>\s*Up<span class="sr-only">/g) ?? []
		expect(ups.length).toBeGreaterThanOrEqual(3)
		expect(ups.filter((one) => /\sdisabled(=|\s|>)/.test(one))).toHaveLength(3)
		expect(html).toMatch(/draggable="true"/)
	})

	test("has no control in the Demo or when the server does not answer", () => {
		const html = body(false)
		expect(html).not.toMatch(/draggable="true"|>Edit<|Add a step|Add an entry|Add a move/)
	})
})

describe("the drawers at phone width", () => {
	const props = (index: number | null = null) => ({ ctx, index, tryValue: false, onDone: () => {} })

	test("a step names its account, how much, and offers no illiquid asset", () => {
		const html = render(StepForm, { props: props() }).body
		expect(html).toContain("Everything that is left")
		expect(html).toContain("A share of what is left, up to an amount")
		expect(html).not.toContain(">condo<")
		expect(html).toContain("home or a car")
	})

	test("a step in the form starts from the stored one", () => {
		expect(render(StepForm, { props: props(1) }).body).toContain('value="30.00"')
	})

	test("an entry offers a floor and says it adds a rest-of entry", () => {
		const html = render(EntryForm, { props: props(1) }).body
		expect(html).toContain('value="100000.00"')
		expect(text(html)).toContain("adds a later entry that takes the rest of this account")
	})

	test("a move has realise off by default, with its explanation, and says how often and when", () => {
		const html = render(TransferForm, { props: { ctx, tryValue: false, onDone: () => {} } }).body
		expect(html).toMatch(/type="checkbox"(?![^>]*checked)[^>]*>\s*<span>Count any gain for tax/)
		expect(text(html)).toContain("Off by default")
		for (const label of ["Move from", "Move to", "How much", "How often", "When it starts"]) {
			expect(html).toContain(label)
		}
	})
})
