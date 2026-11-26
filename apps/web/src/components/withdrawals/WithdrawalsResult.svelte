<script lang="ts">
import { type ItemNames, itemLabel } from "../../lib/view/item-names"
import type { Terms } from "../../lib/view/projection/terms"
import type { WithdrawalsView } from "../../lib/view/withdrawals"
import ItemWords from "../ui/ItemWords.svelte"
import BandsSection from "./BandsSection.svelte"
import RuleYearsTable from "./RuleYearsTable.svelte"

interface Props {
	view: WithdrawalsView
	terms: Terms
	/** The plan's names by id, for the label of each rule Flow. */
	names: ItemNames
	/** Names the block when a what-if shows two: "With your try" or "Saved plan". Absent when there is one. */
	title?: string | undefined
	/** False when the plan holds no spending Flow at all, so a block with no rule years says that and not "a level amount". */
	spends?: boolean
}

/** The Rule years of each rule Flow and, when the plan reads a Return model, what the rule pays in good and bad markets. */
let { view, terms, names, title, spends = true }: Props = $props()
</script>

<div class="space-y-6">
	{#if title}<h2 class="text-lg font-semibold">{title}</h2>{/if}
	{#each view.rules as rule (rule.flow)}
		{@const label = itemLabel(names, "flow", rule.flow)}
		<section aria-label={`${label.text} year by year`} class="space-y-2">
			<h3 class="text-base font-semibold">Year by year: <ItemWords {label} /></h3>
			<RuleYearsTable {rule} currency={view.currency} {terms} {names} />
		</section>
	{/each}
	{#if view.chance}
		<section aria-label="In good and bad markets" class="space-y-4">
			<h3 class="text-base font-semibold">In good and bad markets</h3>
			<p class="text-sm"><span class="text-2xl font-semibold tracking-tight tabular-nums">{view.chance.share}</span> chance of success: {view.chance.succeeded} of {view.chance.paths} seeded Market paths hold to {view.chance.horizon}.</p>
			{#if view.bands}<BandsSection bands={view.bands} currency={view.currency} />{:else if view.rules.length === 0}<p class="text-sm text-muted-foreground">{spends ? "A level amount has no rule years and no Bands: it pays the same in every market, so only the chance of success moves." : "There is no spending rule in this plan yet. Use \"Set how you spend in retirement\" above to add one."}</p>{/if}
		</section>
	{/if}
</div>
