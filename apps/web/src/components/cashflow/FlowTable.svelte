<script lang="ts">
import { preferences } from "../../client/preferences.svelte.js"
import type { FlowLayout } from "../../lib/chart/flow"
import { formatMoney, maskMoney } from "../../lib/format"

interface Props {
	layout: FlowLayout
	label: string
}

/** Each band of the year and its amount, for a screen reader: one table, whichever picture is drawn. */
let { layout, label }: Props = $props()

/** A money string as the page shows it: its digits grouped, or masked when amounts are hidden. */
const shown = (amount: string): string =>
	preferences.hidden ? maskMoney(amount) : formatMoney(amount)
</script>

<div class="sr-only">
	<table>
		<caption>{label}, each band and its amount</caption>
		<thead>
			<tr>
				<th scope="col">Side</th>
				<th scope="col">Band</th>
				<th scope="col">Amount</th>
			</tr>
		</thead>
		<tbody>
			{#each layout.nodes as node (node.key)}
				<tr>
					<td>{node.side === "source" ? "From" : "To"}</td>
					<td>{node.label}</td>
					<td>{shown(node.amount)}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
