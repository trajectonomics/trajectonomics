<script lang="ts">
import { lostWindow, maskedFocus } from "../../client/masked-focus.js"
import { preferences } from "../../client/preferences.svelte.js"
import { draftAfterInput, maskMoney } from "../../lib/format"
import type { Choice } from "../../lib/view/plan-items/options"

interface Props {
	/** The field's id: its label names it, and its problem is described by it. */
	id: string
	label: string
	/** The text the field holds. A select holds one of its choices' values. */
	value?: string
	/** The choices of a select; a text field when none is given. */
	options?: readonly Choice[]
	/** The keyboard the field asks for, such as the decimal keypad for an amount or the numeric one for a count. */
	inputmode?: "decimal" | "numeric" | "text"
	/** The message at this field: the form's own problem, or the CLI's refusal of it. */
	problem?: string | undefined
	/** A short hint under the label, such as the form a date takes. */
	hint?: string | undefined
	/** Whether the field is read-only here, such as a date a household pins. */
	disabled?: boolean
	/** Whether the field holds a money amount, which Hide amounts masks while it is not focused. */
	money?: boolean
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
	money = false,
}: Props = $props()

/** The choices the select offers, plus the held value when the list does not name it, so it never opens empty. */
const choices = $derived(
	options === undefined || value === "" || options.some((option) => option.value === value)
		? options
		: [...options, { value, label: value }],
)
let focused = $state(false)
/** True while the digits show as the mask: a focused field shows the real value, so the person can edit it. */
const masked = $derived(money && preferences.hidden && !focused && value.trim() !== "")
const shown = $derived(masked ? maskMoney(value) : value)

/** The draft a typed value makes. Undo can put the mask back, which is no amount, so it keeps the draft and the field. */
function onInput(event: Event & { currentTarget: HTMLInputElement }): void {
	const typed = event.currentTarget.value
	const next = money ? draftAfterInput(value, typed) : typed
	if (next !== typed) event.currentTarget.value = next
	value = next
}

/** Every text the field is described by, so a hint and a problem are both there. */
const described = $derived(
	[
		hint === undefined ? undefined : `${id}-hint`,
		problem === undefined ? undefined : `${id}-problem`,
		masked ? `${id}-masked` : undefined,
	]
		.filter((one) => one !== undefined)
		.join(" ") || undefined,
)
</script>

<div class="space-y-1.5">
	<label for={id} class="block text-sm font-medium text-foreground">{label}</label>
	{#if hint}<p id="{id}-hint" class="text-xs text-muted-foreground">{hint}</p>{/if}
	{#if choices}
		<select
			{id}
			{disabled}
			bind:value
			aria-describedby={described}
			class="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus-visible:outline-2 focus-visible:outline-ring"
		>
			{#each choices as option (option.value)}
				<option value={option.value}>{option.label}</option>
			{/each}
		</select>
	{:else}
		<input
			{id}
			{disabled}
			value={shown}
			oninput={onInput}
			onfocus={() => (focused = true)}
			onblur={(event) => {
				// A blur while the field is still active is the window losing focus, so the digits stay shown.
				if (!lostWindow(event.currentTarget)) focused = false
			}}
			use:maskedFocus={() => money && preferences.hidden && value.trim() !== ""}
			{inputmode}
			autocomplete="off"
			aria-invalid={problem ? "true" : undefined}
			aria-describedby={described}
			class="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus-visible:outline-2 focus-visible:outline-ring"
		/>
	{/if}
	{#if masked}<span id="{id}-masked" class="sr-only">Amount hidden. Select the field to see and edit it.</span>{/if}
	{#if problem}<p id="{id}-problem" role="alert" class="text-sm text-destructive">{problem}</p>{/if}
</div>
