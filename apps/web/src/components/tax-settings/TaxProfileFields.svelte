<script lang="ts">
import type { Shown } from "../../lib/view/plan-items/problems"
import type { TaxDraft } from "../../lib/view/tax-settings/draft"
import { AMOUNT_FIELDS, COUNT_FIELDS, FILING_CHOICES } from "../../lib/view/tax-settings/fields"
import Field from "../plan-items/Field.svelte"

interface Props {
	draft: TaxDraft
	shown: Shown
}

let { draft = $bindable(), shown }: Props = $props()
const choices = [{ value: "", label: "Choose a filing status" }, ...FILING_CHOICES]
</script>

<Field id="tax-filing-status" label="Filing status" options={choices} bind:value={draft.filingStatus} problem={shown.at("filingStatus")} />
{#each COUNT_FIELDS as field (field.key)}
	<Field id={`tax-${field.key}`} label={field.label} hint={field.hint} inputmode="decimal" bind:value={draft[field.key]} problem={shown.at(field.key)} />
{/each}
<p class="text-sm text-muted-foreground">Amounts are what you paid in the tax year, in baht.</p>
{#each AMOUNT_FIELDS as field (field.key)}
	<Field id={`tax-${field.key}`} label={field.label} hint={field.hint} inputmode="decimal" bind:value={draft[field.key]} problem={shown.at(field.key)} />
{/each}
