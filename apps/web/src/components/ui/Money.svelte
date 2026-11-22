<script lang="ts">
import { preferences } from "../../client/preferences.svelte.js"
import { formatMoney, maskMoney } from "../../lib/format"
import { cx } from "./cx"

interface Props {
	/** The CLI's decimal string, such as "-94000.00". Shown as it is, with its digits grouped. */
	amount: string
	/** The currency code, shown beside the amount. */
	currency?: string | undefined
	/** Colours a negative amount as a warning. The sign itself is always shown. */
	signed?: boolean
	/** Overrides the hide-amounts switch. Left out, the switch decides. */
	hidden?: boolean | undefined
}

let { amount, currency, signed = false, hidden }: Props = $props()
const isHidden = $derived(hidden ?? preferences.hidden)
const negative = $derived(amount.startsWith("-"))
</script>

<!-- A money amount with tabular figures. Hidden, its digits become a mask and its sign stays. -->
<span class={cx("whitespace-nowrap tabular-nums", signed && negative && "text-destructive")}>
	<span aria-hidden={isHidden ? "true" : undefined}>{isHidden ? maskMoney(amount) : formatMoney(amount)}</span
	>{#if isHidden}<span class="sr-only"> amount hidden</span>{/if}{#if currency}<span
			class="ml-1 text-xs text-muted-foreground">{currency}</span
		>{/if}
</span>
