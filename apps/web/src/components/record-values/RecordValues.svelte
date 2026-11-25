<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import { currentSearch } from "../../client/location.svelte.js"
import { valueSheetSession } from "../../client/record-values.svelte.js"
import type { Snapshot } from "../../lib/contract"
import { editsShown } from "../../lib/edit/shown"
import { valueSheet } from "../../lib/view/record-values/sheet"
import ImportHistory from "../import-values/ImportHistory.svelte"
import ValueSheet from "./ValueSheet.svelte"

interface Props {
	snapshot: Snapshot
}

let { snapshot }: Props = $props()
const sheet = $derived(valueSheet(snapshot))
const shown = $derived(editsShown(editSession.token, currentSearch()))
</script>

<!-- The buttons that open the sheet and the import wizard. The sheet is the Dashboard's first write to the ledger, so it shows only where an Edit does. -->
{#if shown && sheet}
	<div class="flex flex-wrap justify-end gap-2">
		<button
			type="button"
			onclick={() => valueSheetSession.show(sheet.asOf)}
			class="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
		>
			Record today's values
		</button>
		<ImportHistory {sheet} />
	</div>
	<ValueSheet {sheet} />
{/if}
