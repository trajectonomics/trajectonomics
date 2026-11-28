<script lang="ts">
import type { Shown } from "../../lib/view/plan-items/problems"
import type { WithdrawalDraft } from "../../lib/view/withdrawals/draft"
import { PAY_CHOICES, ROUNDING_CHOICES } from "../../lib/view/withdrawals/options"
import { HOW_CHOICES } from "../../lib/view/withdrawals/words"
import Field from "../plan-items/Field.svelte"

interface Props {
	draft: WithdrawalDraft
	shown: Shown
}

let { draft = $bindable(), shown }: Props = $props()
const rule = $derived(draft.how !== "" && draft.how !== "level")
</script>

<!-- How the person spends: the way, then the amount or the share it names. No rate and no rounding is chosen for them. -->
<div class="space-y-4">
	<p class="text-sm text-muted-foreground">No rate or share is filled in for you: each is your own estimate.</p>
	<Field id="spend-how" label="How you spend" options={HOW_CHOICES} bind:value={draft.how} problem={shown.at("how")} />
	{#if draft.how !== ""}
		<Field id="spend-frequency" label="How it is paid" hint={draft.startMode === "milestone" ? "A monthly rule pays from the month the Milestone fires. A yearly one pays on the same day each year, counted from the plan's As-of." : undefined} options={PAY_CHOICES} bind:value={draft.frequency} problem={shown.at("frequency")} />
	{/if}
	{#if draft.how === "level"}
		<Field id="spend-amount" label={draft.frequency === "annual" ? "Amount each year" : "Amount each month"} inputmode="decimal" money hint="Keeps pace with inflation. A decimal number, such as 40000.00" bind:value={draft.amount} problem={shown.at("amount")} />
	{/if}
	{#if rule}
		<Field id="spend-rate" label={draft.how === "currentRate" ? "Share of your savings each year" : "Share of your savings at the start"} inputmode="decimal" hint="Your own estimate. A percent with at most two places, such as 4 or 4.25" bind:value={draft.rate} problem={shown.at("rate")} />
		<Field id="spend-rounding" label="Rounding of each payment" options={ROUNDING_CHOICES} bind:value={draft.rounding} problem={shown.at("rounding")} />
	{/if}
</div>
