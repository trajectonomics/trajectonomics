<script lang="ts">
import { currentItemText } from "../../client/item-names.svelte.js"
import type { PersonCard } from "../../lib/view/household/model"
import ItemName from "../ui/ItemName.svelte"

interface Props {
	people: readonly PersonCard[]
	editable: boolean
	onEdit: (id: string) => void
}

let { people, editable, onEdit }: Props = $props()
</script>

<ul class="grid gap-3 sm:grid-cols-2">
	{#each people as person (person.id)}
		<li class="rounded-lg border border-border p-3">
			<div class="flex items-start justify-between gap-3">
				<h3 class="font-semibold break-all"><ItemName kind="person" id={person.id} /></h3>
				{#if editable}
					<button
						type="button"
						aria-label="Edit {currentItemText("person", person.id)}"
						onclick={() => onEdit(person.id)}
						class="shrink-0 rounded-md border border-border px-2.5 py-1 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
					>
						Edit
					</button>
				{/if}
			</div>
			<dl class="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
				<dt class="text-muted-foreground">Id</dt>
				<dd><code class="font-mono text-[0.9em]">{person.id}</code></dd>
				<dt class="text-muted-foreground">Role</dt>
				<dd>{person.role}</dd>
				<dt class="text-muted-foreground">Born</dt>
				<dd>{person.born}</dd>
				<dt class="text-muted-foreground">Life expectancy</dt>
				<dd>{person.lifeExpectancy}</dd>
				{#if person.joins !== null}
					<dt class="text-muted-foreground">Joins</dt>
					<dd>{person.joins}</dd>
				{/if}
			</dl>
		</li>
	{/each}
</ul>
