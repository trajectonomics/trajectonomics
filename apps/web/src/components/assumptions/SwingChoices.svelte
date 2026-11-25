<script lang="ts">
import { chosenOf, fillWith, SWING_CHOICES } from "../../lib/view/assumptions/choices"

interface Props {
	/** The id the field has, so each choice names the field it fills. */
	forId: string
	/** The text of the volatility field. A choice only puts text here; the person changes it as any other. */
	value: string
	disabled?: boolean
}

let { forId, value = $bindable(), disabled = false }: Props = $props()
const chosen = $derived(chosenOf(value))
const button =
	"rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground outline-none hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50 aria-pressed:bg-muted aria-pressed:font-medium"
</script>

<!-- Three starting points for the field above. They fill it with a round percent and keep nothing else. -->
<div role="group" aria-label="Fill in a swing" class="flex flex-wrap gap-2" data-for={forId}>
	{#each SWING_CHOICES as choice (choice.id)}
		<button
			type="button"
			{disabled}
			aria-pressed={chosen === choice.id}
			onclick={() => (value = fillWith(choice))}
			class={button}
		>
			{choice.label} <span class="text-muted-foreground">{choice.example}, {choice.text}%</span>
		</button>
	{/each}
</div>
