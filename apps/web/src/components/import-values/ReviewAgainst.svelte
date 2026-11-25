<script lang="ts">
import { importSession as session } from "../../client/import-values.svelte.js"
import { valueSheetSession } from "../../client/record-values.svelte.js"
import type { ImportPlan } from "../../lib/view/import-values/plan"
import type { ValueSheet } from "../../lib/view/record-values/types"
import { choiceLabel, needsAgainstAccount } from "../../lib/view/record-values/words"

interface Props {
	sheet: ValueSheet
	plan: ImportPlan
	/** The CLI's refusal of the account chosen, shown at the field. */
	problem?: string | undefined
	/** True while traj is checking or importing: the account cannot change under it. */
	disabled?: boolean
}

let { sheet, plan, problem, disabled = false }: Props = $props()
</script>

<!-- The account the differences count against: the one the Record today's values sheet uses, chosen once for this tab. -->
{#if needsAgainstAccount(sheet)}
	<div class="space-y-2" role="alert">
		<p class="text-sm font-medium text-foreground">Count against</p>
		<p class="text-sm text-muted-foreground">The ledger has no income or equity account to count a change in value against, so nothing can be imported yet. Make one, then reload:</p>
		{#each sheet.addCommands as command (command)}
			<code class="block overflow-x-auto rounded-md border border-border bg-muted p-2 text-xs">{command}</code>
		{/each}
	</div>
{:else}
	<div class="space-y-1.5">
		<label for="import-against" class="block text-sm font-medium text-foreground">Count against</label>
		<p class="text-xs text-muted-foreground">The income or equity account a change in value is counted against.</p>
		<select
			id="import-against"
			{disabled}
			value={valueSheetSession.against}
			onchange={(event) => {
				valueSheetSession.against = event.currentTarget.value
				void session.check(plan, sheet)
			}}
			aria-describedby={problem ? "import-against-problem" : undefined}
			class="w-full min-w-0 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus-visible:outline-2 focus-visible:outline-ring"
		>
			<option value="">Choose an account</option>
			{#each sheet.choices as choice (choice.id)}
				<option value={choice.id}>{choiceLabel(choice)}</option>
			{/each}
		</select>
		{#if problem}<p id="import-against-problem" role="alert" class="text-sm text-destructive">{problem}</p>{/if}
	</div>
{/if}
