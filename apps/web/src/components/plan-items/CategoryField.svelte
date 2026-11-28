<script lang="ts">
interface Props {
	value: string
	/** The categories the plan's expenses already use: suggestions only, never a preset list. */
	categories: readonly string[]
	problem: string | undefined
}

let { value = $bindable(), categories, problem }: Props = $props()
</script>

<!-- The category of an expense: free text, with the ones already used offered. -->
<div class="space-y-1.5">
	<label for="flow-category" class="block text-sm font-medium text-foreground">Category</label>
	<p id="flow-category-hint" class="text-xs text-muted-foreground">Groups this expense on the Expenses page. Optional.</p>
	<input id="flow-category" list="flow-categories" bind:value autocomplete="off" aria-invalid={problem ? "true" : undefined} aria-describedby="flow-category-hint" class="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring" />
	<datalist id="flow-categories">
		{#each categories as category (category)}<option value={category}></option>{/each}
	</datalist>
	{#if problem}<p role="alert" class="text-sm text-destructive">{problem}</p>{/if}
</div>
