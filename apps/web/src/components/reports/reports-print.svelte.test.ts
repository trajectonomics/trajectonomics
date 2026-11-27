import { afterAll, beforeEach, describe, expect, test } from "bun:test"
import { render } from "svelte/server"
import { setTestUrl } from "../../../scripts/svelte/app-stub"
import SideNavigation from "../shell/SideNavigation.svelte"
import ReportDownloads from "./ReportDownloads.svelte"
import ReportPicker from "./ReportPicker.svelte"
import ReportPreview from "./ReportPreview.svelte"

const noop = () => {}
const file = { name: "base-annual-2026-10-31.csv", type: "text/csv", text: "" }

// The address is shared by every test file in the process, so it is put back as it was.
afterAll(() => setTestUrl("http://127.0.0.1/"))

describe("the Reports page on paper", () => {
	beforeEach(() => setTestUrl("http://127.0.0.1/reports/"))

	test("the picker is left out of a printed page, and it names each field as traj stated it", () => {
		const { body } = render(ReportPicker, {
			props: {
				tables: [
					{
						name: "annual",
						label: "Yearly rows",
						columns: [{ key: "index", numeric: true }],
						records: [],
					},
				],
				selected: "annual",
				columns: [{ key: "index", numeric: true }],
				hidden: [],
				onPick: noop,
				onToggle: noop,
			},
		})
		expect(body).toContain('class="print:hidden space-y-4"')
		expect(body).toContain("index")
	})

	test("the download buttons and the print button are left out of a printed page", () => {
		const { body } = render(ReportDownloads, {
			props: { csv: () => file, json: () => file, all: () => file, csvReady: true },
		})
		expect(body).toContain('class="print:hidden space-y-2"')
		for (const label of ["Download CSV", "Download JSON", "Download everything", "Print"]) {
			expect(body).toContain(label)
		}
		expect(body).toContain("A landscape page fits about 15 fields.")
	})

	test("the screen heading is left out of paper, and a cell holds its text escaped", () => {
		const { body } = render(ReportPreview, {
			props: {
				label: "Account balances",
				columns: [{ key: "account", numeric: false }],
				records: [{ account: "<b>ธนาคาร</b> & co" }],
				heading: "แผน · As of 2026-10-31 · Future money",
			},
		})
		expect(body).toMatch(/<p class="print:hidden [^"]*">แผน · As of 2026-10-31 · Future money<\/p>/)
		expect(body).toContain("&lt;b&gt;ธนาคาร&lt;/b&gt; &amp; co")
		expect(body).not.toContain("<b>ธนาคาร</b>")
		expect(body).toContain('<div data-report="">')
	})

	test("the side navigation is left out of a printed page", () => {
		const { body } = render(SideNavigation, {
			props: {
				brand: "<svg></svg>",
				current: "/reports/",
				names: ["base"],
				selected: "base",
				onPlan: noop,
			},
		})
		expect(body).toMatch(/<aside[^>]*class="print:hidden /)
	})
})
