<script lang="ts">
import type { ScenarioDocument } from "../../lib/contract"
import type { ReturnView } from "../../lib/view/allowances"
import { type PersonNames, personText } from "../../lib/view/item-names"
import LaterYears from "./LaterYears.svelte"
import YearCard from "./YearCard.svelte"

interface Props {
	one: ReturnView
	currency: string
	/** The plan the Edit controls write to; null when the page cannot edit. */
	plan: { name: string; contentHash: string; doc: ScenarioDocument } | null
	people: PersonNames
}

let { one, currency, plan, people }: Props = $props()
/** A separate filing's Return is named by its Filer; a joint Return over both spouses keeps one name. */
const title = $derived(one.filer === null ? "Your joint Return" : personText(people, one.filer))
</script>

<!-- One Return: its current tax year, then its later years, each with that Return's own ceilings and headroom. -->
<section aria-label={title} class="space-y-4">
	<h2 class="text-lg font-semibold">{title}</h2>
	{#if one.current}<YearCard year={one.current} {currency} {plan} {people} />{/if}
	{#if one.later.length > 0}<LaterYears years={one.later} {currency} {plan} {people} />{/if}
</section>
