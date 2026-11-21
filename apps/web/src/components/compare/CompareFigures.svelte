<script lang="ts">
import type { FigureRow } from "../../lib/view/compare"
import CellView from "./CellView.svelte"

interface Props {
	rows: readonly FigureRow[]
	currency: string
	/** The headers of A and B, with their Scenario names. */
	headers: readonly [string, string]
}

/**
 * One row per figure: A, the CLI's difference (B minus A) and B. The figure's name stays in view
 * while the numbers scroll sideways on a narrow screen, so every value keeps its row.
 */
let { rows, currency, headers }: Props = $props()

const HEAD_BASE = "border-b border-border bg-card px-3 py-2 font-medium text-muted-foreground"
const HEAD_FIGURE = `${HEAD_BASE} sticky left-0 z-10 text-left`
const HEAD_NUMBER = `${HEAD_BASE} text-right`
const CELL_FIGURE = "sticky left-0 z-10 bg-card px-3 py-2 text-left align-top"
const CELL_NUMBER = "bg-card px-3 py-2 text-right align-top tabular-nums"
</script>

<div class="max-w-full overflow-x-auto rounded-lg border border-border">
	<table class="w-full min-w-[32rem] border-collapse text-sm">
		<caption class="bg-card px-3 py-2 text-left text-sm font-medium text-muted-foreground">
			Figures in {currency}
		</caption>
		<thead>
			<tr>
				<th scope="col" class={HEAD_FIGURE}>Figure</th>
				<th scope="col" class={HEAD_NUMBER}>{headers[0]}</th>
				<th scope="col" class={HEAD_NUMBER}>Difference, B minus A</th>
				<th scope="col" class={HEAD_NUMBER}>{headers[1]}</th>
			</tr>
		</thead>
		<tbody>
			{#each rows as row (row.key)}
				<tr class="border-b border-border last:border-0">
					<th scope="row" class={`${CELL_FIGURE} font-normal`}>{row.label}</th>
					<td class={CELL_NUMBER}><CellView cell={row.a} /></td>
					<td class={CELL_NUMBER}><CellView cell={row.difference} /></td>
					<td class={CELL_NUMBER}><CellView cell={row.b} /></td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
