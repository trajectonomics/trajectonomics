<script lang="ts">
import type { AssetDraft } from "../../lib/view/plan-items/asset-draft"
import type { OwnedChoice } from "../../lib/view/plan-items/asset-owned"
import type { Shown } from "../../lib/view/plan-items/problems"
import AssetBasics from "./AssetBasics.svelte"
import AssetBuying from "./AssetBuying.svelte"
import AssetIncome from "./AssetIncome.svelte"
import AssetKeeping from "./AssetKeeping.svelte"
import AssetSelling from "./AssetSelling.svelte"

interface Props {
	draft: AssetDraft
	editing: boolean
	choices: readonly OwnedChoice[]
	/** The names of Baseline assets left out of the choices because the plan's routing names them. */
	routed: readonly string[]
	shown: Shown
	/** The household's labels of the purchase and sale dates, or null where it pins none. */
	anchors: { purchase: string | null; sale: string | null }
	plan: string
}

let { draft = $bindable(), editing, choices, routed, shown, anchors, plan }: Props = $props()
</script>

<!-- A home or a car: every rate and share is the person's own, and none is filled in before they type it. -->
<div class="space-y-4">
	<p class="text-sm text-muted-foreground">Every rate and share here is your own estimate. Nothing is filled in for you.</p>
	<AssetBasics bind:draft {editing} {choices} {routed} {shown} />
	{#if draft.ownership === "buy"}
		<AssetBuying bind:draft {shown} anchor={anchors.purchase} {plan} />
	{/if}
	<AssetKeeping bind:draft {shown} />
	<AssetIncome bind:draft {shown} />
	<AssetSelling bind:draft {shown} anchor={anchors.sale} {plan} />
	{#if shown.general}<p role="alert" class="text-sm text-destructive">{shown.general}</p>{/if}
</div>
