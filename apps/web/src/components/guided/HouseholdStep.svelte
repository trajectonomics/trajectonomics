<script lang="ts">
import type { PersonProblem } from "../../lib/view/guided/people"
import { personWords } from "../../lib/view/guided/people"
import type { PersonDraft } from "../../lib/view/household/person-draft"
import GuidedPerson from "./GuidedPerson.svelte"
import { BUTTON } from "./styles"

interface Props {
	people: readonly PersonDraft[]
	problems: readonly PersonProblem[]
	/** Whether Next found a problem, so every field shows its own. */
	showProblems: boolean
	/** The step's heading, which the page focuses when the step changes. */
	heading?: HTMLHeadingElement | undefined
	onName: (index: number, name: string) => void
	onChange: (index: number, change: Partial<PersonDraft>) => void
	onAdd: (role: "partner" | "dependent") => void
	onRemove: (index: number) => void
}

let {
	people,
	problems,
	showProblems,
	heading = $bindable(),
	onName,
	onChange,
	onAdd,
	onRemove,
}: Props = $props()
const general = $derived(problems.find((one) => one.index === -1)?.problem)
</script>

<section class="space-y-4">
	<h2 bind:this={heading} tabindex="-1" class="text-base font-semibold">You and your household</h2>
	<div class="space-y-6">
		{#each people as person, index (index)}
			<div class="space-y-2">
				<GuidedPerson {index} {person} {problems} {showProblems}
					onName={(name) => onName(index, name)}
					onChange={(change) => onChange(index, change)} />
				{#if person.role !== "holder"}
					<button type="button" class={BUTTON} aria-label="Remove {personWords(person)}"
						onclick={() => onRemove(index)}>Remove</button>
				{/if}
			</div>
		{/each}
	</div>
	{#if general && showProblems}<p role="alert" class="text-sm text-destructive">{general}</p>{/if}
	<div class="flex flex-wrap gap-2">
		<button type="button" class={BUTTON} onclick={() => onAdd("partner")}>Add partner</button>
		<button type="button" class={BUTTON} onclick={() => onAdd("dependent")}>Add dependent</button>
	</div>
	<p class="text-xs text-muted-foreground">Life expectancy is always required.</p>
</section>
