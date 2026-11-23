<script lang="ts">
import type { AssetDraft } from "../../lib/view/plan-items/asset-draft"
import { DIRECTION_CHOICES, OWNERSHIP_CHOICES } from "../../lib/view/plan-items/asset-options"
import {
	type OwnedChoice,
	ownedChoiceOf,
	ownedSelectChoices,
	ownedUnavailable,
} from "../../lib/view/plan-items/asset-owned"
import type { Shown } from "../../lib/view/plan-items/problems"
import Money from "../ui/Money.svelte"
import Field from "./Field.svelte"

interface Props {
	draft: AssetDraft
	/** Whether the asset exists already: its name is its id, and is not edited. */
	editing: boolean
	/** The assets of the Baseline an owned asset may attach to. */
	choices: readonly OwnedChoice[]
	routed: readonly string[]
	shown: Shown
}

let { draft = $bindable(), editing, choices, routed, shown }: Props = $props()
const unavailable = $derived(ownedUnavailable(choices, routed))
const ownerships = $derived(
	unavailable !== null && !editing ? OWNERSHIP_CHOICES.slice(1) : OWNERSHIP_CHOICES,
)
const held = $derived(ownedChoiceOf(choices, draft.ownedAccount))
</script>

<!-- What the asset is, whether it is owned or bought, and how its value changes. Every rate is the person's own. -->
{#if editing}
	<p class="text-sm text-foreground">Asset <span class="font-medium">{draft.name}</span></p>
{:else}
	<Field id="asset-ownership" label="The asset" options={ownerships} bind:value={draft.ownership} problem={shown.at("ownership")} />
	{#if draft.ownership === "owned"}
		<Field id="asset-owned" label="Which asset" hint="An asset the Baseline holds. It is kept out of accessible net worth." options={ownedSelectChoices(choices)} bind:value={draft.ownedAccount} problem={shown.at("ownedAccount")} />
	{:else}
		<Field id="asset-name" label="Name" bind:value={draft.name} problem={shown.at("name")} />
	{/if}
{/if}
{#if held !== undefined && draft.ownership === "owned"}
	<p class="-mt-3 text-sm text-muted-foreground">The Baseline holds <Money amount={held.balance} /> in {held.name}.</p>
{/if}
{#if unavailable !== null && !editing}
	<p class="-mt-3 text-xs text-muted-foreground">"I own it already" is unavailable: {unavailable}</p>
{/if}
<Field id="asset-direction" label="Its value each year" options={DIRECTION_CHOICES} bind:value={draft.direction} problem={shown.at("direction")} />
<Field id="asset-rate" label="Percent a year" inputmode="decimal" hint="Your own estimate: a percent with at most two places, such as 3 or 2.50" bind:value={draft.valueRate} problem={shown.at("valueRate")} />
