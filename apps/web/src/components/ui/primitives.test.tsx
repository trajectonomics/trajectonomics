import { describe, expect, test } from "bun:test"
import { renderToStaticMarkup } from "react-dom/server"

import { DataTable } from "./DataTable"
import { EmptyState } from "./EmptyState"
import { Provenance } from "./Provenance"
import { SegmentedControl } from "./SegmentedControl"

describe("Provenance, EmptyState and SegmentedControl", () => {
	test("shows the command under 'Show the command'", () => {
		const html = renderToStaticMarkup(<Provenance argv={["doctor", "--json"]} />)
		expect(html).toContain("Show the command")
		expect(html).toContain("traj doctor --json")
	})

	test("renders an empty state with its title", () => {
		expect(renderToStaticMarkup(<EmptyState title="Nothing yet" />)).toContain("Nothing yet")
	})

	test("marks the chosen option as checked in a radio group", () => {
		const html = renderToStaticMarkup(
			<SegmentedControl
				name="scenario"
				label="Scenario"
				value="b"
				onChange={() => undefined}
				options={[
					{ value: "a", label: "Base" },
					{ value: "b", label: "Early" },
				]}
			/>,
		)
		expect(html).toContain('type="radio"')
		expect(html).toMatch(/checked=""[^>]*value="b"/)
		expect(html).toContain("<legend")
	})
})

describe("DataTable", () => {
	test("has a caption, right-aligns numeric columns and scrolls in its own wrapper", () => {
		const html = renderToStaticMarkup(
			<DataTable
				caption="Accounts"
				columns={[
					{ key: "name", header: "Account", cell: (row: { name: string }) => row.name },
					{ key: "amount", header: "Amount", numeric: true, cell: () => "1.00" },
				]}
				rows={[{ name: "Bank" }]}
				rowKey={(row) => row.name}
			/>,
		)
		expect(html).toContain("<caption")
		expect(html).toContain("Accounts")
		expect(html).toContain("overflow-auto")
		expect(html).toContain("text-right")
	})
})
