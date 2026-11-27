<script lang="ts">
import { preferences } from "../../client/preferences.svelte.js"
import { formatMoney, maskMoney } from "../../lib/format"
import type { GuidedMoneyRow } from "../../lib/view/guided/money"
import type { RowDraft } from "../../lib/view/guided/money-draft"
import Badge from "../ui/Badge.svelte"
import { INPUT, PROBLEM } from "./styles"

interface Props {
	row: GuidedMoneyRow
	draft: RowDraft
	/** The problem at this row's amount, or null. */
	problem: string | null
	onKeep: (keep: boolean) => void
	onAmount: (amount: string) => void
	onEarned: (earned: boolean) => void
}

let { row, draft, problem, onKeep, onAmount, onEarned }: Props = $props()
/** The CLI's amount behind the hide-amounts mask, in the field until a number is typed. */
const stated = $derived(formatMoney(row.amount))
const placeholder = $derived(preferences.hidden ? maskMoney(stated) : stated)
</script>

<!-- One Account: kept or dropped, the CLI's amount, the month window, and for income the stop-work and tax facts. -->
<li class="space-y-2 py-3">
	<div class="flex flex-wrap items-center gap-x-3 gap-y-1.5">
		<input id="guided-keep-{row.id}" type="checkbox" checked={draft.keep}
			onchange={(event) => onKeep(event.currentTarget.checked)} />
		<label for="guided-keep-{row.id}" class="text-sm text-foreground">Keep</label>
		<label for="guided-amount-{row.id}" class="min-w-0 text-sm font-medium text-foreground">{row.name}</label>
	</div>
	<div class="flex flex-wrap items-center gap-2">
		<input id="guided-amount-{row.id}" class={INPUT} value={draft.amount} {placeholder}
			inputmode="decimal" autocomplete="off" disabled={!draft.keep}
			aria-invalid={problem ? "true" : undefined}
			aria-describedby={problem ? `guided-amount-${row.id}-problem` : undefined}
			oninput={(event) => onAmount(event.currentTarget.value)} />
		<span class="text-sm text-muted-foreground">{row.frequency === "yearly" ? "per year" : "per month"}</span>
		<span class="text-xs text-muted-foreground">{row.monthsText}</span>
	</div>
	{#if problem}<p id="guided-amount-{row.id}-problem" role="alert" class={PROBLEM}>{problem}</p>{/if}
	{#if row.type === "income"}
		<div class="flex flex-wrap items-center gap-2 text-sm">
			<input id="guided-stops-{row.id}" type="checkbox" checked={draft.earned}
				onchange={(event) => onEarned(event.currentTarget.checked)} />
			<label for="guided-stops-{row.id}" class="text-foreground">Stops when I stop working</label>
			<Badge>No tax label yet</Badge>
		</div>
	{/if}
</li>
