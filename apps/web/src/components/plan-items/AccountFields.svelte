<script lang="ts">
import type { AccountDraft } from "../../lib/view/plan-items/accounts"
import { COMPOUNDING_CHOICES, KIND_CHOICES } from "../../lib/view/plan-items/options"
import type { Shown } from "../../lib/view/plan-items/problems"
import Field from "./Field.svelte"

interface Props {
	draft: AccountDraft
	/** The Account's id when it is edited; absent for a new one, whose name becomes its id. */
	existingId?: string | undefined
	shown: Shown
}

let { draft = $bindable(), existingId, shown }: Props = $props()
</script>

<!-- The fields of an Account. A rate is a percent with at most two places; a lock applies to an asset only. -->
<div class="space-y-4">
	{#if existingId !== undefined}
		<p class="text-sm text-foreground">Account <span class="font-medium">{existingId}</span></p>
	{:else}
		<Field id="account-name" label="Name" bind:value={draft.name} problem={shown.at("name")} />
	{/if}
	<Field id="account-kind" label="Kind" options={KIND_CHOICES} bind:value={draft.kind} problem={shown.at("kind")} />
	<Field id="account-rate" label="Rate a year" inputmode="decimal" hint="A percent, such as 3.50" bind:value={draft.rate} problem={shown.at("rate")} />
	<Field id="account-compounding" label="Compounding" options={COMPOUNDING_CHOICES} bind:value={draft.compounding} problem={shown.at("compounding")} />
	{#if draft.kind === "asset"}
		<Field id="account-locked" label="Locked until" hint="YYYY-MM-DD, or empty for no lock" bind:value={draft.lockedUntil} problem={shown.at("lockedUntil")} />
	{/if}
	{#if shown.general}<p role="alert" class="text-sm text-destructive">{shown.general}</p>{/if}
</div>
