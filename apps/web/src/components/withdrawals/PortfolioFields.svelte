<script lang="ts">
import type { Shown } from "../../lib/view/plan-items/problems"
import type { PortfolioChoice } from "../../lib/view/withdrawals/context"

interface Props {
	/** The Accounts the rule reads, by id. */
	chosen: string[]
	/** The asset Accounts a rule may read: a debt and an Account that is not liquid are never offered. */
	choices: readonly PortfolioChoice[]
	shown: Shown
}

let { chosen = $bindable(), choices, shown }: Props = $props()
</script>

<!-- The Accounts the rule reads: the liquid assets of the plan's withdraw list at first, each one removable. -->
<fieldset class="space-y-2">
	<legend class="text-sm font-medium text-foreground">Paid from</legend>
	<p class="text-xs text-muted-foreground">The rule takes its share of what these Accounts are worth each year.</p>
	{#each choices as choice (choice.id)}
		<label class="flex items-center gap-2 text-sm text-foreground">
			<input type="checkbox" value={choice.id} bind:group={chosen} class="size-4" />
			{choice.label}
		</label>
	{/each}
	{#if choices.length === 0}<p class="text-sm text-muted-foreground">This plan has no liquid asset Account. Add one in Assets and debts first.</p>{/if}
	{#if shown.at("portfolio")}<p role="alert" class="text-sm text-destructive">{shown.at("portfolio")}</p>{/if}
</fieldset>
