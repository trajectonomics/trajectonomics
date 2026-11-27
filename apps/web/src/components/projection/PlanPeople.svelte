<script lang="ts">
import type { PlanPerson } from "../../lib/view/projection/plan"
import ItemName from "../ui/ItemName.svelte"
import SiteLink from "../ui/SiteLink.svelte"

interface Props {
	/** The household's people, with the ages the first annual row states. */
	people: readonly PlanPerson[]
	/** Whether the plan holds a household; without one the row offers to add people only when edits show. */
	hasHousehold: boolean
	/** Whether the server answers Edits, so "Add people" shows without a household. */
	editable: boolean
}

/** The household as one line of chips: each person's name and age, then the way to the household page. */
let { people, hasHousehold, editable }: Props = $props()
const chip =
	"inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-sm text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
</script>

{#if hasHousehold || editable}
	<nav aria-label="People" class="flex flex-wrap items-center gap-2">
		{#each people as person (person.id)}
			<SiteLink href="/household/" class={chip}>
				<ItemName kind="person" id={person.id} />
				{#if person.age !== null}<span class="tabular-nums text-muted-foreground">{person.age}</span>{/if}
			</SiteLink>
		{/each}
		{#if hasHousehold}
			<SiteLink href="/household/" class="text-sm text-accent underline-offset-4 hover:underline">Household</SiteLink>
		{:else}
			<SiteLink href="/household/" class="text-sm text-accent underline-offset-4 hover:underline">Add people</SiteLink>
		{/if}
	</nav>
{/if}
