<script lang="ts">
import type { PersonProblem } from "../../lib/view/guided/people"
import type { PersonDraft } from "../../lib/view/household/person-draft"
import GuidedPerson from "./GuidedPerson.svelte"
import { BUTTON } from "./styles"

interface Props {
	people: readonly PersonDraft[]
	problems: readonly PersonProblem[]
	onName: (index: number, name: string) => void
	onChange: (index: number, change: Partial<PersonDraft>) => void
	onAdd: (role: "partner" | "dependent") => void
}

let { people, problems, onName, onChange, onAdd }: Props = $props()
const general = $derived(problems.find((one) => one.index === -1)?.problem)
</script>

<section class="space-y-4">
	<h2 class="text-base font-semibold">You and your household</h2>
	<div class="space-y-6">
		{#each people as person, index (index)}
			<GuidedPerson {index} {person} {problems}
				onName={(name) => onName(index, name)}
				onChange={(change) => onChange(index, change)} />
		{/each}
	</div>
	{#if general}<p role="alert" class="text-sm text-destructive">{general}</p>{/if}
	<div class="flex flex-wrap gap-2">
		<button type="button" class={BUTTON} onclick={() => onAdd("partner")}>Add partner</button>
		<button type="button" class={BUTTON} onclick={() => onAdd("dependent")}>Add dependent</button>
	</div>
	<p class="text-xs text-muted-foreground">Life expectancy is always required.</p>
</section>
