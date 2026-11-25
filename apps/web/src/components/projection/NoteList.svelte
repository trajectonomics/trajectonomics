<script lang="ts">
import { noteAnchor } from "../../lib/view/projection/notes"

interface Props {
	notes: readonly string[]
	/** The Scenario the notes belong to: their ids are scoped by it, so two results never collide. */
	scenario: string
}

/** Every note the CLI states on the result, in its order, each at the id a warning links to. */
let { notes, scenario }: Props = $props()
</script>

{#if notes.length === 0}
	<p class="text-sm text-muted-foreground">No notes</p>
{:else}
	<div class="space-y-2 text-sm">
		<p class="font-medium">Notes</p>
		<ul class="list-disc space-y-1 pl-5">
			{#each notes as note, index (index)}
				<li id={noteAnchor(scenario, index)}>{note}</li>
			{/each}
		</ul>
	</div>
{/if}
