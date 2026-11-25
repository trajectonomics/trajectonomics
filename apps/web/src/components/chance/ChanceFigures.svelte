<script lang="ts">
import { preferences } from "../../client/preferences.svelte.js"
import { maskMoney } from "../../lib/format"
import type { BandRow, RunsOutBar } from "../../lib/view/chance/page"

interface Props {
	/** The CLI's Bands table: a few roll-up ends, with the 10th, 50th and 90th Percentiles. */
	bandRows: readonly BandRow[]
	/** One row per roll-up: the failing Market paths whose Runs-out falls in it. */
	runsOut: readonly RunsOutBar[]
}

/**
 * The two charts' figures as visually hidden tables, the text alternative a screen reader and a touch
 * reader use (web ADR 0026). Money is masked with the same switch as the charts.
 */
let { bandRows, runsOut }: Props = $props()
const money = (value: string) => (preferences.hidden ? maskMoney(value) : value)
</script>

<div class="sr-only">
	<table>
		<caption>Net worth Bands by roll-up end, from the CLI's Bands table</caption>
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
					<td>{money(row.p10)}</td>
					<td>{money(row.p50)}</td>
					<td>{money(row.p90)}</td>
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
