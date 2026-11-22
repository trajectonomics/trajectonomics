<script lang="ts">
import type { ProjectionCompare } from "../../lib/contract"
import { formatDate } from "../../lib/format"
import { taxStatusWords } from "../../lib/view/tax"
import Badge from "../ui/Badge.svelte"

interface Props {
	data: ProjectionCompare
}

/** The tax status, the birth date the ages count from, and the sentences a person reads first. */
let { data }: Props = $props()
</script>

<section aria-label="Assumptions" class="space-y-3 text-sm">
	<div class="flex flex-wrap items-center gap-2">
		<Badge>{taxStatusWords(data.tax)}</Badge>
		{#if data.birthDate}
			<span class="text-muted-foreground">Ages count from {formatDate(data.birthDate)}</span>
		{/if}
	</div>
	{#if data.notes.length > 0}
		<ul class="list-disc space-y-1 pl-5 text-muted-foreground">
			{#each data.notes as note, index (index)}
				<li>{note}</li>
			{/each}
		</ul>
	{/if}
</section>
