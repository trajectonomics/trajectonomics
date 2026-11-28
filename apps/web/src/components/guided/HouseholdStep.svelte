<script lang="ts">
import { tick } from "svelte"
import type { PersonProblem } from "../../lib/view/guided/people"
import { personWords } from "../../lib/view/guided/people"
import type { PersonDraft } from "../../lib/view/household/person-draft"
import GuidedPerson from "./GuidedPerson.svelte"
import { BUTTON } from "./styles"

interface Props {
	people: readonly PersonDraft[]
	/** One durable key per person, so a Remove never hands another person's answers to their fields. */
	keys: readonly string[]
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
	keys,
	problems,
	showProblems,
	heading = $bindable(),
	onName,
	onChange,
	onAdd,
	onRemove,
}: Props = $props()
const general = $derived(problems.find((one) => one.index === -1)?.problem)
/** Every person with the key their block keeps, so a Remove never moves one person's touched fields onto another. */
const keyed = $derived(
	people.map((person, index) => ({ key: keys[index] ?? `index-${index}`, person, index })),
)
/** Each person's block by key, so a Remove can take focus to the first field of the person after it. */
let blocks: Record<string, HTMLDivElement | undefined> = $state({})
let addPartner = $state<HTMLButtonElement>()

/** Removes a person, then focuses the person after them, or "Add partner" when none follows. */
async function removeAt(index: number, following: string | undefined): Promise<void> {
	onRemove(index)
	await tick()
	const first = following === undefined ? null : (blocks[following]?.querySelector("input") ?? null)
	if (first === null) addPartner?.focus()
	else first.focus()
}
</script>

<section class="space-y-4">
	<h2 bind:this={heading} tabindex="-1" class="text-base font-semibold">You and your household</h2>
	<div class="space-y-6">
		{#each keyed as one (one.key)}
			<div class="space-y-2" bind:this={blocks[one.key]}>
				<GuidedPerson index={one.index} person={one.person} {problems} {showProblems}
					onName={(name) => onName(one.index, name)}
					onChange={(change) => onChange(one.index, change)} />
				{#if one.person.role !== "holder"}
					<button type="button" class={BUTTON} aria-label="Remove {personWords(one.person)}"
						onclick={() => void removeAt(one.index, keyed[one.index + 1]?.key)}>Remove</button>
				{/if}
			</div>
		{/each}
	</div>
	{#if general && showProblems}<p role="alert" class="text-sm text-destructive">{general}</p>{/if}
	<div class="flex flex-wrap gap-2">
		<button bind:this={addPartner} type="button" class={BUTTON} onclick={() => onAdd("partner")}>Add partner</button>
		<button type="button" class={BUTTON} onclick={() => onAdd("dependent")}>Add dependent</button>
	</div>
	<p class="text-xs text-muted-foreground">Life expectancy is always required.</p>
</section>
