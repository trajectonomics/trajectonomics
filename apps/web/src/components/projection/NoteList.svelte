<script lang="ts">
import { currentHash } from "../../client/location.svelte.js"
import { noteAnchor } from "../../lib/view/projection/notes"
import { cx } from "../ui/cx"

interface Props {
	notes: readonly string[]
	/** The Scenario the notes belong to: their ids are scoped by it, so two results never collide. */
	scenario: string
}

/** Every note the CLI states on the result, in its order, each at the id a warning links to. */
let { notes, scenario }: Props = $props()
const hash = $derived(currentHash())
</script>

{#if notes.length === 0}
	<p class="text-sm text-muted-foreground">No notes</p>
{:else}
	<div class="space-y-2 text-sm">
		<p class="font-medium">Notes</p>
		<ul class="list-disc space-y-1 pl-5">
			{#each notes as note, index (index)}
				{@const anchor = noteAnchor(scenario, index)}
				<li
					id={anchor}
					class={cx(
						"scroll-mt-24 target:rounded-sm target:bg-muted",
						hash === anchor && "rounded-sm bg-muted",
					)}
				>
					{note}
				</li>
			{/each}
		</ul>
	</div>
{/if}
