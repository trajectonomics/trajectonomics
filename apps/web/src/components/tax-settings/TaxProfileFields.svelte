<script lang="ts">
import { TAX_FLAG_KEYS } from "../../lib/edit/tax-flags"
import type { Shown } from "../../lib/view/plan-items/problems"
import type { TaxDraft } from "../../lib/view/tax-settings/draft"
import { AMOUNT_FIELDS, COUNT_FIELDS, FILING_CHOICES } from "../../lib/view/tax-settings/fields"
import Field from "../plan-items/Field.svelte"

interface Props {
	draft: TaxDraft
	shown: Shown
	/** The items the form shows: one group's, or every item. */
	visible?: readonly string[]
	/** Whether the household names a partner and Owners: `traj` refuses `shared=` with no such pair. */
	sharedClaimable?: boolean
}

let {
	draft = $bindable(),
	shown,
	visible = TAX_FLAG_KEYS,
	sharedClaimable = true,
}: Props = $props()
const choices = [{ value: "", label: "Choose a filing status" }, ...FILING_CHOICES]
const counts = $derived(COUNT_FIELDS.filter((field) => visible.includes(field.key)))
// The shared home-loan interest needs a separate draft and a household with a partner and Owners: `traj` refuses `shared=` otherwise.
const separate = $derived(draft.filingStatus === "married_separate" && sharedClaimable)
const amounts = $derived(
	AMOUNT_FIELDS.filter(
		(field) => visible.includes(field.key) && (field.key !== "sharedMortgageInterest" || separate),
	),
)
</script>

{#if visible.includes("filingStatus")}
	<Field id="tax-filing-status" label="Filing status" options={choices} bind:value={draft.filingStatus} problem={shown.at("filingStatus")} />
{/if}
{#each counts as field (field.key)}
	<Field id={`tax-${field.key}`} label={field.label} hint={field.hint} inputmode="numeric" bind:value={draft[field.key]} problem={shown.at(field.key)} />
{/each}
{#if amounts.length > 0}
	<p class="text-sm text-muted-foreground">Amounts are what you paid in the tax year, in baht.</p>
{/if}
{#each amounts as field (field.key)}
	<Field id={`tax-${field.key}`} label={field.label} hint={field.hint} inputmode="decimal" bind:value={draft[field.key]} problem={shown.at(field.key)} />
{/each}
