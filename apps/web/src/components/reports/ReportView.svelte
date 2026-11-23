<script lang="ts">
import type { Snapshot } from "../../lib/contract"
import { shownColumns, toggleHidden } from "../../lib/view/reports/columns"
import {
	everythingFile,
	type ReportFile,
	runFile,
	type SessionChanges,
	tableFile,
} from "../../lib/view/reports/files"
import {
	noProjectionReason,
	type ReportTarget,
	reportSource,
	termsWords,
} from "../../lib/view/reports/source"
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
	/** The fields the person has hidden from the table picked. */
	hidden?: string[]
}

let { snapshot, plan, terms, lens, changes, hidden = $bindable([]) }: Props = $props()
const source = $derived(reportSource(snapshot.reads, plan, lens))
const tables = $derived(source === null ? [] : reportTables(source.run))
let picked = $state("")
const table = $derived(tables.find((candidate) => candidate.name === picked) ?? tables[0])
const shown = $derived(table === undefined ? [] : shownColumns(table.columns, hidden))
const heading = $derived(
	source === null
		? ""
		: `${plan} · As of ${source.asOf} · ${termsWords(terms)}${source.whatIf ? " · What-if session" : ""}`,
)
// With no projection the other reads of the plan may still be fine, so "Download everything" stays.
const named = $derived<ReportTarget>(source ?? { plan, asOf: snapshot.params.asOf, whatIf: false })
const downloads = $derived(
	source === null || table === undefined
		? null
		: { csv: () => tableFile(source, table, hidden), json: () => runFile(source) },
)

function all(): ReportFile {
	return everythingFile(snapshot.reads, source ?? named, changes)
}

function pick(name: string): void {
	picked = name
	hidden = []
}
</script>

{#if downloads === null || table === undefined}
	<p role="status" class="text-muted-foreground">{noProjectionReason(snapshot.reads, plan)}</p>
	<ReportDownloads csv={null} json={null} {all} csvReady={false} />
{:else}
	<ReportPicker
		tables={tables}
		selected={table.name}
		columns={table.columns}
		{hidden}
		onPick={pick}
		onToggle={(key) => (hidden = toggleHidden(hidden, key))}
	/>
	<ReportDownloads
		csv={downloads.csv}
		json={downloads.json}
		{all}
		csvReady={shown.length > 0}
	/>
	<ReportPreview label={table.label} columns={shown} records={table.records} {heading} />
{/if}
