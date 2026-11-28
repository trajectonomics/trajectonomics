<script lang="ts">
import type { ScenarioDocument } from "../../lib/contract"
import type { YearView } from "../../lib/view/allowances"
import type { PersonNames } from "../../lib/view/item-names"
import Money from "../ui/Money.svelte"
import Stat from "../ui/Stat.svelte"
import LineList from "./LineList.svelte"
import YearActions from "./YearActions.svelte"

interface Props {
	year: YearView
	currency: string
	/** The plan the Edit controls write to; null when the page cannot edit. */
	plan: { name: string; contentHash: string; doc: ScenarioDocument } | null
	/** The household's people, so a joint Return names each spouse's allowances. */
	people: PersonNames
	/** The recorded `claimsHolder`, so a departed Return reads here as the profile's tables name it. */
	claimsHolder: string | null
	/** The Return this card sits in, when the page shows one section per Return: it names the region and steps the heading down. */
	region?: string
}

let { year, currency, plan, people, claimsHolder, region }: Props = $props()
const label = $derived(region === undefined ? "This tax year" : `${region}: this tax year`)
</script>

<!-- The tax year the As-of falls in: the tax due now, the tax due with every suggestion, and the saving. -->
<section aria-label={label} class="space-y-4 rounded-lg border border-border bg-card p-4 sm:p-5">
	<header>
		{#if region === undefined}
			<h2 class="text-base font-semibold">This tax year</h2>
		{:else}
			<h3 class="text-base font-semibold">This tax year</h3>
		{/if}
		<p class="text-sm text-muted-foreground">Tax for {year.period}, due {year.settles}</p>
	</header>
	<div class="grid gap-4 sm:grid-cols-3">
		<Stat label="Tax due now" valueClassName="text-lg">{#snippet value()}<Money amount={year.dueBefore} {currency} />{/snippet}</Stat>
		<Stat label="Tax due with every suggestion" valueClassName="text-lg">{#snippet value()}<Money amount={year.dueAfter} {currency} />{/snippet}</Stat>
		<Stat label="Tax saved" valueClassName="text-lg">{#snippet value()}<Money amount={year.saving} {currency} />{/snippet}</Stat>
	</div>
	<LineList lines={year.lines} {currency} {people} {claimsHolder} />
	{#if plan !== null}<YearActions {year} {plan} {people} {claimsHolder} />{/if}
</section>
