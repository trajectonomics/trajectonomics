<script lang="ts">
import { preferences } from "../../client/preferences.svelte.js"
import { formatMoney, maskMoney } from "../../lib/format"
import { type AmountDirection, directedAmount } from "../../lib/format/direction"

interface Props {
	/** The CLI's decimal string, such as "-94000.00". Its digits are shown as they are. */
	amount: string
	/** What the amount means for a person: money in, money out or money owed. */
	direction: AmountDirection
	/** The currency code, shown beside the amount. */
	currency?: string | undefined
	/** Overrides the hide-amounts switch. Left out, the switch decides. */
	hidden?: boolean | undefined
}

let { amount, direction, currency, hidden }: Props = $props()
const shown = $derived(directedAmount(amount, direction))
const isHidden = $derived(hidden ?? preferences.hidden)
const ledger = $derived(formatMoney(amount))
</script>

<!-- A money amount with a direction word. The ledger's signed figure stays in the title; hidden, its digits mask. -->
<span
	class="whitespace-nowrap tabular-nums"
	title={isHidden ? undefined : `The ledger states ${ledger}${currency ? ` ${currency}` : ""}`}
>
	<span class="text-muted-foreground">{shown.word}</span>
	<span class="ml-1" aria-hidden={isHidden ? "true" : undefined}
		>{isHidden ? maskMoney(shown.digits) : formatMoney(shown.digits)}</span
	>{#if isHidden}<span class="sr-only"> amount hidden</span>{/if}{#if currency}<span
			class="ml-1 text-xs text-muted-foreground">{currency}</span
		>{/if}
</span>
