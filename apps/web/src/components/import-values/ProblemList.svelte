<script lang="ts">
import type { ListedItem } from "../../lib/view/import-values/words"

interface Props {
	/** What the list says, such as "Rows to fix". */
	title: string
	items: readonly ListedItem[]
	/** How many more problems there are than the list shows. */
	more: number
}

let { title, items, more }: Props = $props()
</script>

<!-- Each line names where the problem is (its row and column in the table) and what is wrong. -->
{#if items.length > 0}
	<div role="alert" class="min-w-0 space-y-2">
		<p class="text-sm font-medium text-destructive">{title}</p>
		<ul class="min-w-0 space-y-1.5">
			{#each items as item (item.key)}
				<li class="min-w-0 break-words text-sm text-foreground">
					<span class="font-medium">{item.place}.</span> {item.message}
				</li>
			{/each}
		</ul>
		{#if more > 0}<p class="text-sm text-muted-foreground">And {more} more.</p>{/if}
	</div>
{/if}
