<script lang="ts">
import type { AssetDraft } from "../../lib/view/plan-items/asset-draft"
import { RENT_CHOICES } from "../../lib/view/plan-items/asset-options"
import type { Shown } from "../../lib/view/plan-items/problems"
import AmountFields from "./AmountFields.svelte"

interface Props {
	draft: AssetDraft
	shown: Shown
}

let { draft = $bindable(), shown }: Props = $props()
</script>

<!-- Income from it: rent, which is passive income and ends before the asset is sold. -->
<fieldset class="space-y-4 border-t border-border pt-4">
	<legend class="text-sm font-semibold text-foreground">Income from it</legend>
	<AmountFields bind:draft={draft.rent} prefix="rent" label="Rent" choices={RENT_CHOICES} percentLabel="Percent of its value a year" growing {shown} />
</fieldset>
