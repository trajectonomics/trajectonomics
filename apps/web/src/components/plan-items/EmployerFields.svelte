<script lang="ts">
import type { EmployerDraft } from "../../lib/view/plan-items/employer-draft"
import type { Shown } from "../../lib/view/plan-items/problems"
import { ROUNDING_CHOICES } from "../../lib/view/withdrawals/options"
import Field from "./Field.svelte"

interface Props {
	draft: EmployerDraft
	shown: Shown
	/** The asset Accounts that are not illiquid, by id: where an employer's share can be paid. */
	targets: readonly string[]
}

let { draft = $bindable(), shown, targets }: Props = $props()
const choices = $derived([
	{ value: "", label: "Choose an account" },
	...targets.map((id) => ({ value: id, label: id })),
])
</script>

<!-- What the employer adds on top of this salary, into an account of the plan. Nothing is filled in for the person. -->
<fieldset class="min-w-0 space-y-4 rounded-md border border-border p-3">
	<legend class="px-1 text-sm font-medium text-foreground">Your employer also pays into</legend>
	<p class="text-xs text-muted-foreground">Leave this section empty when your employer adds nothing. It lands in the account outside your cash and stops when this salary stops. The share is your own figure.</p>
	<Field id="employer-account" label="Account" options={choices} bind:value={draft.account} problem={shown.at("employerAccount")} />
	<Field id="employer-share" label="Share of this salary" inputmode="decimal" hint="A percent of the gross, such as 5" bind:value={draft.share} problem={shown.at("employerShare")} />
	<Field id="employer-rounding" label="Each amount rounds" options={ROUNDING_CHOICES} bind:value={draft.rounding} problem={shown.at("employerRounding")} />
</fieldset>
