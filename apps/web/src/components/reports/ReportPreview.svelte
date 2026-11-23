<script lang="ts">
import type { ReportColumn, ReportRecord } from "../../lib/view/reports/table"
import DataTable from "../ui/DataTable.svelte"
import { dataColumns } from "./report-columns"

interface Props {
	/** The table's label, which names it above the preview. */
	label: string
	/** The fields shown: a hidden one is left out of the preview and the printed page. */
	columns: readonly ReportColumn[]
	records: readonly ReportRecord[]
	/** The plan, the As-of date, the terms and whether the figures are a What-if session's. */
	heading: string
}

let { label, columns, records, heading }: Props = $props()
const rows = $derived(records.map((record, id) => ({ id, record })))
</script>

<!-- The printed header of the page names the plan, As-of date and terms; this line is for the screen. -->
<p class="print:hidden text-sm text-muted-foreground">{heading}</p>
<div data-report>
	<DataTable
		caption={label}
		columns={dataColumns(columns)}
		{rows}
		rowKey={(row) => String(row.id)}
	/>
</div>
