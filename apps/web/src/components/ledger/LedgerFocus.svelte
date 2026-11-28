<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import { currentSearch } from "../../client/location.svelte.js"
import type { AccountList, Read, TxList } from "../../lib/contract"
import { editsShown } from "../../lib/edit/shown"
import { firstDayTwoMonthsBack } from "../../lib/snapshot/dates"
import { ledgerFocusView } from "../../lib/view/ledger/focus"
import FocusPoint from "../ui/FocusPoint.svelte"
import LedgerFocusVisual from "./LedgerFocusVisual.svelte"

interface Props {
	/** The chart of accounts: one row per active account. */
	accounts: Read<AccountList>
	/** The transactions of the period: the last day each account was recorded. */
	transactions: Read<TxList>
	/** The Snapshot's As-of: the window's end, and the day its transactions Read stops at. */
	asOf: string
}

/** The page's focus point: one row per account, a dot at its last record in the two months the Read covers. */
let { accounts, transactions, asOf }: Props = $props()
const focus = $derived(
	accounts.ok && transactions.ok
		? ledgerFocusView(accounts.data, transactions.data, asOf, firstDayTwoMonthsBack(asOf))
		: null,
)
/** Values are recorded on Net worth, and only where an Edit is shown, so the Demo has no button. */
const action = $derived(
	editsShown(editSession.token, currentSearch())
		? { label: "Record values", href: "/net-worth/" }
		: undefined,
)
const ROW_MAX = 22
const ROWS_TOTAL = 240
const rowHeight = $derived(
	focus === null ? ROW_MAX : Math.min(ROW_MAX, ROWS_TOTAL / focus.rows.length),
)
</script>

{#if focus}
	<FocusPoint label={focus.label} {action}>
		{#snippet visual()}
			<LedgerFocusVisual {focus} {rowHeight} />
		{/snippet}
	</FocusPoint>
{/if}
