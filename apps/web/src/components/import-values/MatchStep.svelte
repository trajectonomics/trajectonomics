<script lang="ts">
import { importSession as session } from "../../client/import-values.svelte.js"
import { matchComplete, type Target } from "../../lib/view/import-values/match"
import type { ImportPlan } from "../../lib/view/import-values/plan"
import type { ParsedImport } from "../../lib/view/import-values/types"
import type { ValueSheet } from "../../lib/view/record-values/types"
import MatchRow from "./MatchRow.svelte"
import { BUTTON, PRIMARY } from "./styles"

interface Props {
	parsed: ParsedImport
	targets: readonly Target[]
	plan: ImportPlan
	sheet: ValueSheet
}

let { parsed, targets, plan, sheet }: Props = $props()
const complete = $derived(matchComplete(parsed.sources, session.matches))
</script>

<!-- Step 2: each account of the table is matched to a Leaf Account of the ledger, or skipped. -->
<form
	aria-label="Match the accounts"
	class="min-w-0 space-y-5"
	onsubmit={(event) => {
		event.preventDefault()
		if (complete) void session.toReview(plan, sheet)
	}}
>
	<p class="text-sm text-muted-foreground">Choose the ledger account each one is, or skip it. An account whose name or id matches exactly is already chosen.</p>
	<ul class="min-w-0 divide-y divide-border">
		{#each parsed.sources as source, index (source.key)}
			<MatchRow {source} {index} {targets} />
		{/each}
	</ul>
	{#if !complete}
		<p class="text-sm text-muted-foreground">Match or skip every account, and match at least one, to go on.</p>
	{/if}
	<div class="flex flex-wrap gap-2">
		<button type="submit" disabled={!complete} class={PRIMARY}>Next</button>
		<button type="button" onclick={() => session.back()} class={BUTTON}>Back</button>
		<button type="button" onclick={() => session.cancel()} class={BUTTON}>Cancel</button>
	</div>
</form>
