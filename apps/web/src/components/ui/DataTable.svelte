<script lang="ts" generics="Row">
import { cx } from "./cx"
import type { Column } from "./table-types"

interface Props {
	/** Names the table for a screen reader, and shows above it. */
	caption: string
	columns: readonly Column<Row>[]
	rows: readonly Row[]
	rowKey: (row: Row) => string
	/** The id a row answers to, so a link can land on it. A row without one has no id. */
	rowId?: (row: Row) => string | undefined
}

let { caption, columns, rows, rowKey, rowId }: Props = $props()
</script>

<!-- A semantic table with a sticky header. It scrolls inside its own wrapper, both ways, so the page
never scrolls sideways. The wrapper is `relative` so a screen-reader-only label in a cell is placed inside it. -->
<div class="relative max-h-[70vh] max-w-full overflow-auto rounded-lg border border-border">
	<table class="w-full min-w-max border-collapse text-sm">
		<caption class="px-3 py-2 text-left text-sm font-medium text-muted-foreground">{caption}</caption>
		<thead class="sticky top-0 z-10 bg-card">
			<tr>
				{#each columns as column (column.key)}
					<th
						scope="col"
						class={cx(
							"border-b border-border px-3 py-2 font-medium text-muted-foreground",
							column.numeric ? "text-right" : "text-left",
						)}>{column.header}</th
					>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each rows as row (rowKey(row))}
				{@const id = rowId?.(row)}
				<tr
					id={id}
					class={cx(
						"border-b border-border last:border-0",
						id !== undefined && "scroll-mt-28",
					)}
				>
					{#each columns as column (column.key)}
						<td class={cx("px-3 py-2 align-top", column.numeric && "text-right tabular-nums")}
							>{@render column.cell(row)}</td
						>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>
