<script lang="ts">
import type { Snapshot } from "../../lib/contract"
import { shownColumns, toggleHidden } from "../../lib/view/reports/columns"
import {
	everythingFile,
	runFile,
	type SessionChanges,
	tableFile,
} from "../../lib/view/reports/files"
import { reportSource, termsWords } from "../../lib/view/reports/source"
import { reportTables } from "../../lib/view/reports/tables"
import type { WhatIfLens } from "../../lib/what-if/lens"
import ReportDownloads from "./ReportDownloads.svelte"
import ReportPicker from "./ReportPicker.svelte"
import ReportPreview from "./ReportPreview.svelte"

interface Props {
	snapshot: Snapshot
	/** The plan the report is of, as the plan switcher names it. */
	plan: string
	/** The terms the address bar asks for, which the heading names. */
	terms: string
	/** The What-if session's reads on this plan, or null; and its changes. */
	lens: WhatIfLens | null
	changes: SessionChanges | null
}

let { snapshot, plan, terms, lens, changes }: Props = $props()
const source = $derived(reportSource(snapshot.reads, plan, lens))
const tables = $derived(source === null ? [] : reportTables(source.run))
let picked = $state("")
let hidden = $state<string[]>([])
const table = $derived(tables.find((candidate) => candidate.name === picked) ?? tables[0])
const shown = $derived(table === undefined ? [] : shownColumns(table.columns, hidden))
const heading = $derived(
	source === null
		? ""
		: `${plan} · As of ${source.asOf} · ${termsWords(terms)}${source.whatIf ? " · What-if session" : ""}`,
)
const downloads = $derived(
	source === null || table === undefined
		? null
		: {
				csv: () => tableFile(source, table, hidden),
				json: () => runFile(source),
				all: () => everythingFile(snapshot.reads, source, changes),
			},
)

function pick(name: string): void {
	picked = name
	hidden = []
}
</script>

{#if downloads === null || table === undefined}
	<p role="status" class="text-muted-foreground">The Snapshot holds no projection for this plan.</p>
{:else}
	<ReportPicker
		tables={tables}
		selected={table.name}
		columns={table.columns}
		{hidden}
		onPick={pick}
		onToggle={(key) => (hidden = toggleHidden(hidden, key))}
	/>
	<ReportDownloads csv={downloads.csv} json={downloads.json} all={downloads.all} />
	<ReportPreview label={table.label} columns={shown} records={table.records} {heading} />
{/if}
