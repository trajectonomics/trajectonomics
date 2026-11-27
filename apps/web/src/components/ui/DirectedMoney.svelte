<script lang="ts">
import { preferences } from "../../client/preferences.svelte.js"
import { formatCompact, formatMoney, maskMoney } from "../../lib/format"
import { type AmountKind, directedAmount } from "../../lib/format/direction"

interface Props {
	/** The CLI's decimal string, such as "-94000.00". Its digits are shown as they are. */
	amount: string
	/** What the amount is about: money moving in or out, a balance owed, or a net total. */
	kind: AmountKind
	/** The currency code, shown beside the amount. */
	currency?: string | undefined
	/** Overrides the hide-amounts switch. Left out, the switch decides. */
	hidden?: boolean | undefined
	/** A card's short form, truncated toward zero; the exact figure stays in the title and accessible text. */
	compact?: boolean
}

let { amount, kind, currency, hidden, compact = false }: Props = $props()
const shown = $derived(directedAmount(amount, kind))
const isHidden = $derived(hidden ?? preferences.hidden)
const ledger = $derived(formatMoney(amount))
const digits = $derived(compact ? formatCompact(shown.digits) : formatMoney(shown.digits))
</script>

<!-- A money amount with a direction word, which zero leaves out. The ledger's signed figure stays in the title; hidden, its digits mask. -->
<span
	class="whitespace-nowrap tabular-nums"
	title={isHidden ? undefined : `The ledger states ${ledger}${currency ? ` ${currency}` : ""}`}
>
	{#if shown.word}<span class="text-muted-foreground">{shown.word}</span>{/if}
	<span class:ml-1={shown.word !== null} aria-hidden={isHidden || compact ? "true" : undefined}
		>{isHidden ? maskMoney(shown.digits) : digits}</span
	>{#if isHidden}<span class="sr-only"> amount hidden</span
		>{:else if compact}<span class="sr-only">{formatMoney(shown.digits)}</span>{/if}{#if currency}<span
			class="ml-1 text-xs text-muted-foreground">{currency}</span
		>{/if}
</span>
