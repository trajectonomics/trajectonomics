<script lang="ts">
import type { TargetDraft } from "../../lib/view/routing/targets"
import Field from "../plan-items/Field.svelte"

interface Props {
	draft: TargetDraft
	/** The field's id and the label of its amount, such as "Fill up to". */
	id: string
	label: string
	problem?: string | undefined
	disabled?: boolean
}

let { draft = $bindable(), id, label, problem, disabled = false }: Props = $props()
</script>

<!-- A target: an amount as typed, which may keep its value in today's money. Nothing is filled in. -->
<Field id="{id}-amount" {label} inputmode="decimal" hint="A decimal number, such as 300000" bind:value={draft.amount} {problem} {disabled} />
<label class="flex items-center gap-2 text-sm text-foreground">
	<input type="checkbox" bind:checked={draft.real} class="size-4" {disabled} />
	Keep its value in today's money: it grows with inflation
</label>
