<script lang="ts">
import type { Shown } from "../../lib/view/plan-items/problems"
import type { WithdrawalDraft } from "../../lib/view/withdrawals/draft"
import BoundFields from "./BoundFields.svelte"
import GuardFields from "./GuardFields.svelte"
import StepRows from "./StepRows.svelte"

interface Props {
	draft: WithdrawalDraft
	shown: Shown
}

let { draft = $bindable(), shown }: Props = $props()
</script>

<!-- What only some rules take: limits and rates by date for a share each year, guardrails for a share with limits. -->
{#if draft.how === "currentRate"}
	<div class="space-y-4">
		<StepRows bind:steps={draft.steps} {shown} />
		<BoundFields name="floor" label="Lowest yearly amount" bind:bound={draft.floor} {shown} />
		<BoundFields name="ceiling" label="Highest yearly amount" bind:bound={draft.ceiling} {shown} />
	</div>
{:else if draft.how === "guardrails"}
	<div class="space-y-4">
		<p class="text-xs text-muted-foreground">Set a cut, a raise, or both. With only the raise it is "Raise after good years, never cut".</p>
		<GuardFields name="upper" bind:guard={draft.upper} {shown} />
		<GuardFields name="lower" bind:guard={draft.lower} {shown} />
	</div>
{/if}
