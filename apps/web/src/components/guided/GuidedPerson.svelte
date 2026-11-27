<script lang="ts">
import type { PersonProblem } from "../../lib/view/guided/people"
import { personWords } from "../../lib/view/guided/people"
import type { PersonDraft } from "../../lib/view/household/person-draft"
import { RELATION_CHOICES } from "../../lib/view/plan-items/options"
import { HINT, INPUT, LABEL, PROBLEM } from "./styles"

interface Props {
	/** The person's place in the household, which names their fields. */
	index: number
	person: PersonDraft
	/** Every problem of the household; this person's are shown at their fields. */
	problems: readonly PersonProblem[]
	/** Whether Next found a problem, so every field shows its own. */
	showProblems: boolean
	onName: (name: string) => void
	onChange: (change: Partial<PersonDraft>) => void
}

let { index, person, problems, showProblems, onName, onChange }: Props = $props()
/** The fields the person has typed in or left, whose problems may show before Next. */
interface Touched {
	name?: boolean
	displayLabel?: boolean
	born?: boolean
	lifeExpectancy?: boolean
	relation?: boolean
}
let touched = $state<Touched>({})
/** The problem at one of this person's fields, or undefined. */
const at = (field: string) =>
	problems.find((one) => one.index === index && one.field === field)?.problem
/** The problem to show at a field: after Next, or once the person has touched it. */
const shownAt = (field: keyof Touched) =>
	showProblems || touched[field] === true ? at(field) : undefined
/** The name's own problem, or the label's: both fields are the one Name a person reads. */
const nameProblem = $derived(shownAt("name") ?? shownAt("displayLabel"))
const RELATIONS = [{ value: "", label: "Choose a relation" }, ...RELATION_CHOICES]
/** An empty name shows who the person is until the person types their own: their id, or the role words. */
const placeholder = $derived(person.displayLabel.trim() === "" ? personWords(person) : "")
</script>

<fieldset class="space-y-3">
	<legend class="text-sm font-semibold text-foreground">
		{#if person.role === "holder"}Account holder{:else if person.role === "partner"}Partner{:else}Dependent{/if}
	</legend>
	<div class="space-y-1.5">
		<label for="guided-name-{index}" class={LABEL}>Name</label>
		<input id="guided-name-{index}" class={INPUT} autocomplete="off" value={person.displayLabel}
			{placeholder}
			oninput={(event) => {
				touched.name = true
				onName(event.currentTarget.value)
			}}
			onblur={() => (touched.name = true)}
			aria-invalid={nameProblem ? "true" : undefined}
			aria-describedby={nameProblem ? `guided-name-${index}-problem` : undefined} />
		{#if nameProblem}<p id="guided-name-{index}-problem" role="alert" class={PROBLEM}>{nameProblem}</p>{/if}
	</div>
	<div class="space-y-1.5">
		<label for="guided-born-{index}" class={LABEL}>Born</label>
		<p class={HINT}>The birth month, YYYY-MM</p>
		<input id="guided-born-{index}" class={INPUT} autocomplete="off" value={person.born}
			oninput={(event) => {
				touched.born = true
				onChange({ born: event.currentTarget.value })
			}}
			onblur={() => (touched.born = true)}
			aria-invalid={shownAt("born") ? "true" : undefined}
			aria-describedby={shownAt("born") ? `guided-born-${index}-problem` : undefined} />
		{#if shownAt("born")}<p id="guided-born-{index}-problem" role="alert" class={PROBLEM}>{shownAt("born")}</p>{/if}
	</div>
	<div class="space-y-1.5">
		<label for="guided-life-{index}" class={LABEL}>Life expectancy</label>
		<p class={HINT}>The age at which life ends, as a whole number. There is no default.</p>
		<input id="guided-life-{index}" class={INPUT} inputmode="decimal" autocomplete="off"
			value={person.lifeExpectancy}
			oninput={(event) => {
				touched.lifeExpectancy = true
				onChange({ lifeExpectancy: event.currentTarget.value })
			}}
			onblur={() => (touched.lifeExpectancy = true)}
			aria-invalid={shownAt("lifeExpectancy") ? "true" : undefined}
			aria-describedby={shownAt("lifeExpectancy") ? `guided-life-${index}-problem` : undefined} />
		{#if shownAt("lifeExpectancy")}<p id="guided-life-{index}-problem" role="alert" class={PROBLEM}>{shownAt("lifeExpectancy")}</p>{/if}
	</div>
	{#if person.role === "dependent"}
		<div class="space-y-1.5">
			<label for="guided-relation-{index}" class={LABEL}>Relation to the account holder</label>
			<select id="guided-relation-{index}" class={INPUT} value={person.relation}
				onchange={(event) => {
					touched.relation = true
					onChange({ relation: event.currentTarget.value })
				}}
				onblur={() => (touched.relation = true)}
				aria-invalid={shownAt("relation") ? "true" : undefined}>
				{#each RELATIONS as choice (choice.value)}<option value={choice.value}>{choice.label}</option>{/each}
			</select>
			{#if shownAt("relation")}<p role="alert" class={PROBLEM}>{shownAt("relation")}</p>{/if}
		</div>
	{/if}
</fieldset>
