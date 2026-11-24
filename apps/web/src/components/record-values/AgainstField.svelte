<script lang="ts">
import { valueSheetSession as session } from "../../client/record-values.svelte.js"
import type { ValueSheet } from "../../lib/view/record-values/types"
import { choiceLabel, needsAgainstAccount } from "../../lib/view/record-values/words"
import Field from "../plan-items/Field.svelte"

interface Props {
	sheet: ValueSheet
}

let { sheet }: Props = $props()
const options = $derived([
	{ value: "", label: "Choose an account" },
	...sheet.choices.map((choice) => ({ value: choice.id, label: choiceLabel(choice) })),
])
</script>

<!-- The income or equity account the differences go to. Chosen once; the sheet keeps it while the tab lives. -->
{#if needsAgainstAccount(sheet)}
	<div class="space-y-2" role="alert">
		<p class="text-sm font-medium text-foreground">Count against</p>
		<p class="text-sm text-muted-foreground">
			The ledger has no income or equity account to count a change in value against, so nothing can be saved yet. Make one, then reload:
		</p>
		{#each sheet.addCommands as command (command)}
			<code class="block overflow-x-auto rounded-md border border-border bg-muted p-2 text-xs">{command}</code>
		{/each}
	</div>
{:else}
	<Field
		id="value-against"
		label="Count against"
		hint="The income or equity account a change in value is counted against."
		{options}
		bind:value={session.against}
		problem={session.problems.against}
	/>
{/if}
