<script lang="ts">
import type { AssumedGroup, AssumedKeeper } from "../../lib/view/assumed/types"
import AssumedLine from "./AssumedLine.svelte"
import AssumedWords from "./AssumedWords.svelte"

interface Props {
	group: AssumedGroup
	keeper: AssumedKeeper | null
}

let { group, keeper }: Props = $props()
const id = $derived(`assumed-${group.key}`)
</script>

<!-- One kind of assumed value: its sentence, where it is changed, then each item. -->
<section aria-labelledby={id} class="space-y-2 py-3">
	<div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
		<h3 {id} class="min-w-0 text-sm font-medium wrap-anywhere">
			<AssumedWords subject={group.sentence.subject} text={group.sentence.text} />
		</h3>
		{#if group.link}
			<a
				href={group.link.href}
				class="text-sm underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
				>{group.link.label}</a
			>
		{/if}
	</div>
	<ul class="space-y-1 text-sm text-muted-foreground">
		{#each group.lines as line (line.key)}
			<AssumedLine {line} {keeper} />
		{/each}
	</ul>
</section>
