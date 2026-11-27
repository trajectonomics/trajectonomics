<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import { valueSheetSession as session } from "../../client/record-values.svelte.js"
import { changedIds, chosenAgainst } from "../../lib/view/record-values/draft"
import type { ValueSheet } from "../../lib/view/record-values/types"
import { footerLine, needsAgainstAccount } from "../../lib/view/record-values/words"
import Field from "../plan-items/Field.svelte"
import AgainstField from "./AgainstField.svelte"
import SheetGroup from "./SheetGroup.svelte"

interface Props {
	sheet: ValueSheet
}

let { sheet }: Props = $props()
const draft = $derived(session.draft())
const against = $derived(chosenAgainst(draft, sheet))
const changed = $derived(changedIds(draft, sheet).length)
const noAccount = $derived(needsAgainstAccount(sheet))
</script>

<!-- The sheet: the date, the account to count against, then one field per account. Save sends every changed row as one batch. -->
<form
	aria-label="Record today's values"
	class="min-w-0 space-y-6"
	onsubmit={(event) => {
		event.preventDefault()
		void session.save(sheet)
	}}
>
	<Field id="value-date" label="Value as of" hint="YYYY-MM-DD, the plan's As-of unless you change it" bind:value={session.date} problem={session.problems.date} />
	<AgainstField {sheet} />
	{#each sheet.groups as group (group.key)}
		<SheetGroup {group} since={sheet.since} />
	{:else}
		<p class="text-sm text-muted-foreground">The ledger has no open asset or debt to value.</p>
	{/each}
	{#if session.problems.general}<p role="alert" class="text-sm text-destructive">{session.problems.general}</p>{/if}
	<div class="sticky -bottom-5 -mx-5 -mb-5 space-y-3 border-t border-border bg-card px-5 pt-4 pb-5">
		<p class="text-sm text-muted-foreground">{footerLine(changed, against, noAccount)}</p>
		<button
			type="submit"
			disabled={editSession.busy || noAccount}
			class="rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
		>
			Save
		</button>
	</div>
</form>
