<script lang="ts">
import { whatIfSession } from "../../client/what-if.svelte.js"
import type { AssetSwitch } from "../../lib/view/plan-items/asset-card"
import AssetSwitchItem from "./AssetSwitch.svelte"

interface Props {
	switches: readonly AssetSwitch[]
	/** The asset the switches belong to, which each switch names. */
	asset: string
	plan: string
	contentHash: string
	onTry: () => void
}

let { switches, asset, plan, contentHash, onTry }: Props = $props()
const button =
	"rounded-md border border-border bg-card px-2.5 py-1 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
</script>

<!-- A what-if control per item of the asset: a switch takes it out of the what-if, and "Try a value" sets its fields. -->
<div class="mt-3 space-y-2 border-t border-border pt-3 text-sm">
	<p class="text-xs text-muted-foreground">In a What-if, each item can be switched off, or its values tried.</p>
	<div class="flex flex-wrap gap-x-4 gap-y-2">
		{#each switches as item (item.id)}
			<AssetSwitchItem {asset} {plan} {contentHash} id={item.id} label={item.label} />
		{/each}
	</div>
	<button type="button" onclick={onTry} disabled={whatIfSession.saving} class={button}>Try a value</button>
</div>
