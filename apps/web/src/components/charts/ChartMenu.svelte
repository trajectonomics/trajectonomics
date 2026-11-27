<script lang="ts">
interface Props {
	/** The chart's name, for the delete question. */
	name: string
	onEdit: () => void
	onDuplicate: () => void
	onDelete: () => void
}

let { name, onEdit, onDuplicate, onDelete }: Props = $props()
let asking = $state(false)
const BUTTON =
	"rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
</script>

<!-- What a person does with a chart of their own: edit it, copy it, or delete it after a question. -->
<div role="group" aria-label="This chart" class="flex flex-wrap items-center gap-2">
	{#if asking}
		<span class="min-w-0 text-sm wrap-anywhere">Delete "{name}"?</span>
		<button type="button" class={BUTTON} onclick={onDelete}>Delete</button>
		<button type="button" class={BUTTON} onclick={() => (asking = false)}>Keep</button>
	{:else}
		<button type="button" class={BUTTON} onclick={onEdit}>Edit</button>
		<button type="button" class={BUTTON} onclick={onDuplicate}>Duplicate</button>
		<button type="button" class={BUTTON} onclick={() => (asking = true)}>Delete</button>
	{/if}
</div>
