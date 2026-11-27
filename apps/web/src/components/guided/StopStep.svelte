<script lang="ts">
import { planNameError } from "../../lib/edit/name"
import { ageProblem } from "../../lib/view/guided/stop"
import { BUTTON, HINT, INPUT, LABEL, PRIMARY, PROBLEM } from "./styles"

interface Props {
	name: string
	age: string
	/** The holder's life expectancy, which the age stays under. */
	lifeExpectancy: number | null
	/** Every name the ledger holds: a new plan cannot repeat one. */
	stored: readonly string[]
	/** Whether the server gave the page a token, so the plan can be saved. */
	saveable: boolean
	saving: boolean
	/** The CLI's message when it refused the save, unchanged. */
	refusal: string | null
	/** Whether the refusal offers Reload, as a ledger that moved since the page read it does. */
	reloadable: boolean
	onName: (name: string) => void
	onAge: (age: string) => void
	onSave: () => void
	onReload: () => void
}

let {
	name,
	age,
	lifeExpectancy,
	stored,
	saveable,
	saving,
	refusal,
	reloadable,
	onName,
	onAge,
	onSave,
	onReload,
}: Props = $props()
const nameProblem = $derived(planNameError(name, stored))
const ageText = $derived(ageProblem(age, lifeExpectancy))
const held = $derived(saving || nameProblem !== null || ageText !== null)
</script>

<section class="space-y-4">
	<h2 class="text-base font-semibold">When you would stop working</h2>
	<div class="space-y-1.5">
		<label for="guided-age" class={LABEL}>Stop-work age</label>
		<p class={HINT}>The age you stop working. Every income that stops with it ends then.</p>
		<input id="guided-age" class={INPUT} inputmode="numeric" autocomplete="off" value={age}
			aria-invalid={ageText ? "true" : undefined}
			aria-describedby={ageText ? "guided-age-problem" : undefined}
			oninput={(event) => onAge(event.currentTarget.value)} />
		{#if ageText}<p id="guided-age-problem" role="alert" class={PROBLEM}>{ageText}</p>{/if}
	</div>
	<div class="space-y-1.5">
		<label for="guided-name" class={LABEL}>Plan name</label>
		<input id="guided-name" class={INPUT} autocomplete="off" value={name}
			aria-invalid={nameProblem ? "true" : undefined}
			aria-describedby={nameProblem ? "guided-name-problem" : undefined}
			oninput={(event) => onName(event.currentTarget.value)} />
		{#if nameProblem}<p id="guided-name-problem" role="alert" class={PROBLEM}>{nameProblem}</p>{/if}
	</div>
	{#if refusal}
		<div class="space-y-2">
			<p role="alert" class={PROBLEM}>{refusal}</p>
			{#if reloadable}<button type="button" class={BUTTON} onclick={onReload}>Reload</button>{/if}
		</div>
	{/if}
	{#if saveable}
		<button type="button" class={PRIMARY} disabled={held} onclick={onSave}>
			{saving ? "Saving…" : "Save plan"}
		</button>
	{/if}
</section>
