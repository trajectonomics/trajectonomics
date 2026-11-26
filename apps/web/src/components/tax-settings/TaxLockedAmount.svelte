<script lang="ts">
import MaskedAmount from "../ui/MaskedAmount.svelte"

interface Props {
	/** The field's id: its label names it, as the input's would. */
	id: string
	label: string
	/** The amount as the form's draft holds it: only the mask shows it, so its digits never reach the page. */
	digits: string
	/** A short hint under the label, as the input's would be. */
	hint?: string | undefined
	/** The message at this field, as the input's would be. */
	problem?: string | undefined
}

let { id, label, digits, hint, problem }: Props = $props()
</script>

<!-- A locked field takes no input, so Hide amounts shows its value as masked text under the same label. -->
<div class="space-y-1.5">
	<label for={id} class="block text-sm font-medium text-foreground">{label}</label>
	{#if hint}<p id="{id}-hint" class="text-xs text-muted-foreground">{hint}</p>{/if}
	<output id={id} aria-describedby={problem ? `${id}-problem` : hint ? `${id}-hint` : undefined} class="block w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground"><MaskedAmount {digits} after=" THB" /></output>
	{#if problem}<p id="{id}-problem" role="alert" class="text-sm text-destructive">{problem}</p>{/if}
</div>
