import { describe, expect, test } from "bun:test"
import { createRawSnippet } from "svelte"
import { render } from "svelte/server"
import DataTable from "./DataTable.svelte"
import EmptyState from "./EmptyState.svelte"
import Provenance from "./Provenance.svelte"
import SegmentedControl from "./SegmentedControl.svelte"
import type { Column } from "./table-types"

describe("Provenance, EmptyState and SegmentedControl", () => {
	test("shows each command under 'Details', named for its result", () => {
		const { body } = render(Provenance, {
			props: {
				name: "Doctor",
				commands: [
					["doctor", "--json"],
					["accounts", "--json"],
				],
			},
		})
		expect(body).toContain(">Details</summary>")
		expect(body).toContain('aria-label="Details of Doctor"')
		expect(body).toContain("traj doctor --json")
		expect(body).toContain("traj accounts --json")
	})

	test("renders an empty state with its title", () => {
		expect(render(EmptyState, { props: { title: "Nothing yet" } }).body).toContain("Nothing yet")
	})

	test("marks the chosen option as checked in a radio group", () => {
		const { body } = render(SegmentedControl, {
			props: {
				name: "scenario",
				label: "Scenario",
				value: "b",
				onChange: () => undefined,
				options: [
					{ value: "a", label: "Base" },
					{ value: "b", label: "Early" },
				],
			},
		})
		expect(body).toContain('type="radio"')
		expect(body).toMatch(/value="b" checked=""/)
		expect(body).toContain("<legend")
	})
})

describe("DataTable", () => {
	test("has a caption, right-aligns numeric columns and scrolls in its own wrapper", () => {
		const cell = createRawSnippet<[unknown]>((row) => ({ render: () => JSON.stringify(row()) }))
		const columns: Column<unknown>[] = [
			{ key: "name", header: "Account", cell },
			{
				key: "amount",
				header: "Amount",
				numeric: true,
				cell: createRawSnippet(() => ({ render: () => "1.00" })),
			},
		]
		const { body } = render(DataTable, {
			props: {
				caption: "Accounts",
				columns,
				rows: [{ name: "Bank" }],
				rowKey: (row: unknown) => JSON.stringify(row),
			},
		})
		expect(body).toContain("<caption")
		expect(body).toContain("Accounts")
		expect(body).toContain("overflow-auto")
		expect(body).toContain("text-right")
		expect(body).toContain('{"name":"Bank"}')
	})
})
