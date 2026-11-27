import { beforeEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { setTestUrl } from "../../../scripts/svelte/app-stub"
import PlanButton from "./PlanButton.svelte"
import PlanMenuList from "./PlanMenuList.svelte"

const noop = () => {}

describe("PlanButton", () => {
	beforeEach(() => setTestUrl("http://127.0.0.1/net-worth/"))

	test("names the plan the pages show, and says what pressing it does", () => {
		const { body } = render(PlanButton, {
			props: { names: ["base", "retire-early"], selected: "retire-early", onChange: noop },
		})
		expect(body).toContain('aria-label="Plan: retire-early. Change plan"')
		expect(body).toContain('aria-haspopup="menu"')
		expect(body).toContain('aria-expanded="false"')
		expect(body).toContain("retire-early")
	})

	test("tags the main plan, and only the main plan", () => {
		const { body } = render(PlanButton, {
			props: {
				names: ["base", "retire-early"],
				selected: "base",
				onChange: noop,
				rows: [
					{ name: "base", contentHash: "a", main: true, hasNotes: false, projected: true },
					{
						name: "retire-early",
						contentHash: "b",
						main: false,
						hasNotes: false,
						projected: true,
					},
				],
			},
		})
		expect(body.match(/>Main</g)).toHaveLength(1)
	})

	test("renders with no plan, naming no plan", () => {
		const { body } = render(PlanButton, { props: { names: [], selected: "", onChange: noop } })
		expect(body).toContain('aria-label="Plan. Change plan"')
		expect(body).toContain(">Plan</span>")
	})

	test("offers no per-plan action: those live on the Plans page", () => {
		const { body } = render(PlanButton, {
			props: { names: ["base"], selected: "base", onChange: noop, editable: true },
		})
		expect(body).not.toContain("Actions for")
		expect(body).not.toContain("Rename")
		expect(body).not.toContain("Delete plan")
	})
})

describe("PlanMenuList", () => {
	const rows = [
		{ name: "retire-early", contentHash: "a", main: true, hasNotes: false, projected: true },
		{ name: "base", contentHash: "b", main: false, hasNotes: false, projected: true },
	]

	test("lists each plan as a radio item, the plan on screen checked", () => {
		const { body } = render(PlanMenuList, {
			props: {
				names: ["retire-early", "base"],
				selected: "base",
				rows,
				onChange: noop,
				onClose: noop,
			},
		})
		expect(body.match(/role="menuitemradio"/g)).toHaveLength(2)
		expect(body).toMatch(
			/role="menuitemradio"[^>]*aria-checked="false"[^>]*>\s*<span[^>]*>retire-early/,
		)
		expect(body).toMatch(/role="menuitemradio"[^>]*aria-checked="true"[^>]*>\s*<span[^>]*>base/)
		expect(body.match(/>Main</g)).toHaveLength(1)
	})

	test("links to every plan side by side, and offers a new plan only when Edits show", () => {
		const readOnly = render(PlanMenuList, {
			props: { names: ["base"], selected: "base", rows, onChange: noop, onClose: noop },
		}).body
		expect(readOnly).toMatch(/href="\/plans\/"[\s\S]*?All plans/)
		expect(readOnly).not.toContain("New plan")
		const editing = render(PlanMenuList, {
			props: {
				names: ["base"],
				selected: "base",
				rows,
				onChange: noop,
				editable: true,
				onClose: noop,
			},
		}).body
		expect(editing).toContain("New plan")
	})
})
