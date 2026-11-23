<script lang="ts">
import type { Choice } from "../../lib/view/plan-items/options"

interface Props {
	/** The field's id: its label names it, and its problem is described by it. */
	id: string
	label: string
	/** The text the field holds. A select holds one of its choices' values. */
	value?: string
	/** The choices of a select; a text field when none is given. */
	options?: readonly Choice[]
	/** The keyboard the field asks for, such as the decimal keypad for an amount. */
	inputmode?: "decimal" | "text"
	/** The message at this field: the form's own problem, or the CLI's refusal of it. */
	problem?: string | undefined
	/** A short hint under the label, such as the form a date takes. */
	hint?: string | undefined
	/** Whether the field is read-only here, such as a date a household pins. */
	disabled?: boolean
}

let {
	id,
	label,
	value = $bindable(""),
	options,
	inputmode = "text",
	problem,
	hint,
	disabled = false,
}: Props = $props()
</script>

<div class="space-y-1.5">
	<label for={id} class="block text-sm font-medium text-foreground">{label}</label>
	{#if hint}<p id="{id}-hint" class="text-xs text-muted-foreground">{hint}</p>{/if}
	{#if options}
		<select
			{id}
			{disabled}
			bind:value
			aria-describedby={problem ? `${id}-problem` : undefined}
			class="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus-visible:outline-2 focus-visible:outline-ring"
		>
			{#each options as option (option.value)}
				<option value={option.value}>{option.label}</option>
			{/each}
		</select>
	{:else}
		<input
			{id}
			{disabled}
			bind:value
			{inputmode}
			autocomplete="off"
			aria-invalid={problem ? "true" : undefined}
			aria-describedby={problem ? `${id}-problem` : hint ? `${id}-hint` : undefined}
			class="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus-visible:outline-2 focus-visible:outline-ring"
		/>
	{/if}
	{#if problem}<p id="{id}-problem" role="alert" class="text-sm text-destructive">{problem}</p>{/if}
</div>
