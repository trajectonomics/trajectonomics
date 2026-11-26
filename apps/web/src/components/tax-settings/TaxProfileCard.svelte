<script lang="ts">
import type { ScenarioShow, TaxYear } from "../../lib/contract"
import { isTaxed } from "../../lib/view/tax-settings/rows"
import TaxProfileActions from "./TaxProfileActions.svelte"
import TaxScope from "./TaxScope.svelte"

interface Props {
	/** The plan the profile belongs to: the Edits save under this name. */
	name: string
	/** The plan as `scenario show` reads it: its tax profile, whether it is taxed, and the hash every Edit names. */
	show: ScenarioShow["scenario"]
	editable: boolean
	/** The plan's tax years, whose assumptions the page echoes for two separate Returns that share a home loan. */
	years?: readonly TaxYear[]
}

let { name, show, editable, years = [] }: Props = $props()
const profile = $derived(show.tax ?? null)
// A Snapshot saved before profiles were kept states no `taxed`; the plan's own tax rules say it.
const taxed = $derived(isTaxed(show))
</script>

<section id="tax-profile" class="space-y-6">
	<div class="space-y-2">
		<h2 class="font-semibold">Tax profile of {name}</h2>
		<TaxScope />
	</div>
	{#if profile === null && taxed}
		<p class="text-sm text-foreground">
			Plan {name} is taxed, but its tax profile is not stored: it was taxed before profiles were kept, or its tax rules were changed by hand since. Set the profile whole to change it here; that writes the tax rules again from what you state.
		</p>
	{:else if profile === null}
		<p class="text-sm text-foreground">Plan {name} is not taxed, so its figures are before tax.</p>
	{/if}
	<TaxProfileActions {name} {show} {editable} {years} />
</section>
