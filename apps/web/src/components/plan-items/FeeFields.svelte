<script lang="ts">
import type { FeeDraft } from "../../lib/view/plan-items/account-income"
import type { Shown } from "../../lib/view/plan-items/problems"
import { ROUNDING_CHOICES } from "../../lib/view/withdrawals/options"
import Field from "./Field.svelte"

interface Props {
	draft: FeeDraft
	shown: Shown
}

let { draft = $bindable(), shown }: Props = $props()
</script>

<!-- What the Account is charged each year, a twelfth a month, outside the household's cash. -->
<fieldset class="min-w-0 space-y-4 rounded-md border border-border p-3">
	<legend class="px-1 text-sm font-medium text-foreground">Yearly fee</legend>
	<p class="text-xs text-muted-foreground">Leave this section empty when the Account charges no fee. The share is your own estimate: traj ships none.</p>
	<Field id="fee-rate" label="Share charged each year" inputmode="decimal" hint="A percent, such as 1.5" bind:value={draft.rate} problem={shown.at("feeRate")} />
	<Field id="fee-rounding" label="Each monthly charge rounds" options={ROUNDING_CHOICES} bind:value={draft.rounding} problem={shown.at("feeRounding")} />
</fieldset>
