<script lang="ts">
import type { LineDraft, ListName } from "../../lib/view/estate/draft"
import { type AccountChoice, HOW_CHOICES, OF_CHOICES } from "../../lib/view/estate/options"
import type { Shown } from "../../lib/view/plan-items/problems"
import { BOUND_GROWTH_CHOICES, ROUNDING_CHOICES } from "../../lib/view/withdrawals/options"
import Field from "../plan-items/Field.svelte"

interface Props {
	line: LineDraft
	list: ListName
	/** The line's field keys start with this, as `fieldKey` writes them. */
	prefix: string
	accounts: readonly AccountChoice[]
	shown: Shown
}

/** The fields of one line: its way of being set, then the share and its base, or the amount and its growth. No value is filled in. */
let { line = $bindable(), list, prefix, accounts, shown }: Props = $props()
const at = (field: string) => shown.at(`${prefix}.${field}`)
const id = (field: string) => `estate-${prefix.replaceAll(".", "-")}-${field}`
</script>

<Field id={id("how")} label="How it is set" options={HOW_CHOICES} bind:value={line.how} problem={at("how")} />
{#if line.how === "share"}
	<Field id={id("share")} label="Share, in percent" inputmode="decimal" hint="Your own estimate. A percent with at most two places, such as 1 or 2.5" bind:value={line.share} problem={at("share")} />
	{#if list === "costs"}
		<Field id={id("of")} label="Share of" options={OF_CHOICES} bind:value={line.of} problem={at("of")} />
		{#if line.of === "accounts"}
			<fieldset class="space-y-1">
				<legend class="text-sm font-medium text-foreground">Accounts the share is taken from</legend>
				{#each accounts as account (account.id)}
					<label class="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" value={account.id} bind:group={line.accounts} class="size-4" />{account.label}</label>
				{/each}
				{#if at("accounts")}<p role="alert" class="text-sm text-destructive">{at("accounts")}</p>{/if}
			</fieldset>
		{/if}
	{:else}
		<p class="text-xs text-muted-foreground">A gift is a share of what is left after debts and costs, and only from a positive estate.</p>
	{/if}
	<Field id={id("rounding")} label="Rounding" options={ROUNDING_CHOICES} bind:value={line.rounding} problem={at("rounding")} />
{:else if line.how === "fixed"}
	<Field id={id("amount")} label="Amount" inputmode="decimal" hint="In today's money, such as 50000.00. It grows from the plan's start." bind:value={line.amount} problem={at("amount")} />
	<Field id={id("growth")} label="How it grows each year" options={BOUND_GROWTH_CHOICES} bind:value={line.growth} problem={at("growth")} />
	{#if line.growth === "fixed"}
		<Field id={id("rate")} label="Percent a year" inputmode="decimal" bind:value={line.rate} problem={at("rate")} />
	{/if}
{/if}
