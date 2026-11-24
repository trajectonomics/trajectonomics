<script lang="ts">
import type { FuturesPage } from "../../lib/view/chance/futures"

interface Props {
	shown: FuturesPage
	onPage: (page: number) => void
}

/** The count of the futures the table shows, and the buttons to the page before and after. */
let { shown, onPage }: Props = $props()
const button =
	"rounded-md border border-border px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
</script>

<div class="flex flex-wrap items-center justify-between gap-3 text-sm">
	<p role="status">
		{#if shown.total === 0}
			No futures to show.
		{:else}
			Showing {shown.from} to {shown.to} of {shown.total} futures.
		{/if}
	</p>
	<div class="flex gap-2">
		<button type="button" class={button} disabled={shown.page <= 1} onclick={() => onPage(shown.page - 1)}
			>Previous 25</button
		>
		<button
			type="button"
			class={button}
			disabled={shown.page >= shown.pages}
			onclick={() => onPage(shown.page + 1)}>Next 25</button
		>
	</div>
</div>
