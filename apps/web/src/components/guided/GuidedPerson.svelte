<script lang="ts">
import type { PersonProblem } from "../../lib/view/guided/people"
import type { PersonDraft } from "../../lib/view/household/person-draft"
import { RELATION_CHOICES } from "../../lib/view/plan-items/options"
import { HINT, INPUT, LABEL, PROBLEM } from "./styles"

interface Props {
	/** The person's place in the household, which names their fields. */
	index: number
	person: PersonDraft
	/** Every problem of the household; this person's are shown at their fields. */
	problems: readonly PersonProblem[]
	onName: (name: string) => void
	onChange: (change: Partial<PersonDraft>) => void
}

let { index, person, problems, onName, onChange }: Props = $props()
/** The problem at one of this person's fields, or undefined. */
const at = (field: string) =>
	problems.find((one) => one.index === index && one.field === field)?.problem
/** The name's own problem, or the label's: both fields are the one Name a person reads. */
const nameProblem = $derived(at("name") ?? at("displayLabel"))
const RELATIONS = [{ value: "", label: "Choose a relation" }, ...RELATION_CHOICES]
</script>

<fieldset class="space-y-3">
	<legend class="text-sm font-semibold text-foreground">
		{#if person.role === "holder"}Account holder{:else if person.role === "partner"}Partner{:else}Dependent{/if}
	</legend>
	<div class="space-y-1.5">
		<label for="guided-name-{index}" class={LABEL}>Name</label>
		<input id="guided-name-{index}" class={INPUT} autocomplete="off" value={person.displayLabel}
			oninput={(event) => onName(event.currentTarget.value)}
			aria-invalid={nameProblem ? "true" : undefined}
			aria-describedby={nameProblem ? `guided-name-${index}-problem` : undefined} />
		{#if nameProblem}<p id="guided-name-{index}-problem" role="alert" class={PROBLEM}>{nameProblem}</p>{/if}
	</div>
	<div class="space-y-1.5">
		<label for="guided-born-{index}" class={LABEL}>Born</label>
		<p class={HINT}>The birth month, YYYY-MM</p>
		<input id="guided-born-{index}" class={INPUT} autocomplete="off" value={person.born}
			oninput={(event) => onChange({ born: event.currentTarget.value })}
			aria-invalid={at("born") ? "true" : undefined}
			aria-describedby={at("born") ? `guided-born-${index}-problem` : undefined} />
		{#if at("born")}<p id="guided-born-{index}-problem" role="alert" class={PROBLEM}>{at("born")}</p>{/if}
	</div>
	<div class="space-y-1.5">
		<label for="guided-life-{index}" class={LABEL}>Life expectancy</label>
		<p class={HINT}>The age at which life ends, as a whole number. There is no default.</p>
		<input id="guided-life-{index}" class={INPUT} inputmode="decimal" autocomplete="off"
			value={person.lifeExpectancy}
			oninput={(event) => onChange({ lifeExpectancy: event.currentTarget.value })}
			aria-invalid={at("lifeExpectancy") ? "true" : undefined}
			aria-describedby={at("lifeExpectancy") ? `guided-life-${index}-problem` : undefined} />
		{#if at("lifeExpectancy")}<p id="guided-life-{index}-problem" role="alert" class={PROBLEM}>{at("lifeExpectancy")}</p>{/if}
	</div>
	{#if person.role === "dependent"}
		<div class="space-y-1.5">
			<label for="guided-relation-{index}" class={LABEL}>Relation to the account holder</label>
			<select id="guided-relation-{index}" class={INPUT} value={person.relation}
				onchange={(event) => onChange({ relation: event.currentTarget.value })}
				aria-invalid={at("relation") ? "true" : undefined}>
				{#each RELATIONS as choice (choice.value)}<option value={choice.value}>{choice.label}</option>{/each}
			</select>
			{#if at("relation")}<p role="alert" class={PROBLEM}>{at("relation")}</p>{/if}
		</div>
	{/if}
</fieldset>
