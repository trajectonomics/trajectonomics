<script lang="ts">
import type { BandRow } from "../../lib/view/chance/bands"
import type { RunsOutBar } from "../../lib/view/chance/page"
import Money from "../ui/Money.svelte"

interface Props {
	/** The CLI's Bands table: a few roll-up ends, with the 10th, 50th and 90th Percentiles. */
	bandRows: readonly BandRow[]
	/** One row per roll-up: the failing Market paths whose Runs-out falls in it. */
	runsOut: readonly RunsOutBar[]
	/** The currency the Bands are in, named in the caption. */
	currency: string
}

/**
 * The two charts' figures as visually hidden tables, the text alternative a screen reader and a touch
 * reader use (web ADR 0026). Money is read through `Money`, so Hide amounts reads "amount hidden".
 */
let { bandRows, runsOut, currency }: Props = $props()
</script>

<div class="sr-only">
	<table>
		<caption>Net worth Bands by roll-up end ({currency})</caption>
		<thead>
			<tr>
				<th scope="col">Roll-up ends</th>
				<th scope="col">10th Percentile</th>
				<th scope="col">50th Percentile</th>
				<th scope="col">90th Percentile</th>
			</tr>
		</thead>
		<tbody>
			{#each bandRows as row (row.ends)}
				<tr>
					<th scope="row">{row.ends}</th>
					<td><Money amount={row.p10} /></td>
					<td><Money amount={row.p50} /></td>
					<td><Money amount={row.p90} /></td>
				</tr>
			{/each}
		</tbody>
	</table>
	<table>
		<caption>Failing Market paths by the roll-up end they run out in</caption>
		<thead>
			<tr>
				<th scope="col">Roll-up ends</th>
				<th scope="col">Failing paths that run out</th>
			</tr>
		</thead>
		<tbody>
			{#each runsOut as bar (bar.ends)}
				<tr>
					<th scope="row">{bar.ends}</th>
					<td>{bar.paths}</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
