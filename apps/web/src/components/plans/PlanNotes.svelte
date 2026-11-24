<script lang="ts">
import type { NotesPreview } from "../../lib/view/plans/notes"

interface Props {
	notes: NotesPreview
}

let { notes }: Props = $props()
</script>

<!-- A plan's notes: the first line, and the whole text under a disclosure when there is more. -->
{#if notes.full === null}
	<p class="text-sm text-muted-foreground break-words">{notes.first}</p>
{:else}
	<details class="text-sm text-muted-foreground">
		<summary class="cursor-pointer break-words">{notes.first}</summary>
		<p class="mt-2 break-words whitespace-pre-line">{notes.full}</p>
	</details>
{/if}
