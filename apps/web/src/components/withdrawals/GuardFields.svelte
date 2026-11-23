<script lang="ts">
import type { Shown } from "../../lib/view/plan-items/problems"
import type { GuardDraft } from "../../lib/view/withdrawals/draft"
import Field from "../plan-items/Field.svelte"

interface Props {
	/** "upper" is the cut when the share grows too large; "lower" is the raise when it grows too small. */
	name: "upper" | "lower"
	guard: GuardDraft
	shown: Shown
}

let { name, guard = $bindable(), shown }: Props = $props()
const cut = $derived(name === "upper")
</script>

<!-- One guardrail, optional: how far the share may drift from yours, and how far the amount moves when it does. -->
<fieldset class="space-y-3">
	<legend class="text-sm font-medium text-foreground">{cut ? "Cut after the share grows too large" : "Raise after the share grows too small"}</legend>
	<Field id="spend-{name}-band" label={cut ? "Cut when the share is this far above yours" : "Raise when the share is this far below yours"} inputmode="decimal" hint="As a percent of your share, such as 20 for one fifth of it. Optional" bind:value={guard.band} problem={shown.at(name)} />
	<Field id="spend-{name}-move" label={cut ? "Cut the amount by" : "Raise the amount by"} inputmode="decimal" hint="A percent, such as 10" bind:value={guard.move} />
</fieldset>
