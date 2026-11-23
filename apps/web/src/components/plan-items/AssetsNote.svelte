<script lang="ts">
import { currentSearch } from "../../client/location.svelte.js"
import { assetsHref } from "../../lib/view/plan-items/asset-link"

interface Props {
	/** The ids of the real assets that have items of this page's kind. */
	assets: readonly string[]
	plan: string
}

let { assets, plan }: Props = $props()
</script>

{#if assets.length > 0}
	<p class="text-sm text-muted-foreground">
		The items of {assets.join(", ")} are on {assets.length === 1 ? "its card" : "their cards"} on
		<a class="underline" href={assetsHref(plan, currentSearch())}>Assets and debts</a>, not listed here.
	</p>
{/if}
