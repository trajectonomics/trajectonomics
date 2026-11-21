<script lang="ts">
interface Props {
	notes: readonly string[]
}

/** Every note the CLI states on the result, in its order. */
let { notes }: Props = $props()
</script>

{#if notes.length === 0}
	<p class="text-sm text-muted-foreground">No notes</p>
{:else}
	<div class="space-y-2 text-sm">
		<p class="font-medium">Notes</p>
		<ul class="list-disc space-y-1 pl-5">
			{#each notes as note (note)}
				<li>{note}</li>
			{/each}
		</ul>
	</div>
{/if}
