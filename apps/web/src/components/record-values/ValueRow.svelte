<script lang="ts">
import { lostWindow, maskedFocus } from "../../client/masked-focus.js"
import { preferences } from "../../client/preferences.svelte.js"
import { valueSheetSession as session } from "../../client/record-values.svelte.js"
import { draftAfterInput, maskMoney } from "../../lib/format"
import type { SheetRow } from "../../lib/view/record-values/types"
import { lastLine, OWED_HINT } from "../../lib/view/record-values/words"
import Money from "../ui/Money.svelte"

interface Props {
	row: SheetRow
	since: string | null
}

let { row, since }: Props = $props()
const typed = $derived(session.values[row.id] ?? "")
const changed = $derived(typed.trim() !== "")
const problem = $derived(session.problems.rows[row.id])
let focused = $state(false)
/** Hide amounts masks the typed value while the field has no focus, as `Field` does a plan item's amount. */
const masked = $derived(preferences.hidden && !focused && changed)
const shown = $derived(masked ? maskMoney(typed) : typed)
const describedBy = $derived(
	[
		problem ? `value-${row.id}-problem` : row.owed ? `value-${row.id}-owed` : "",
		masked ? `value-${row.id}-masked` : "",
	]
		.join(" ")
		.trim() || undefined,
)

/** The draft a typed value makes: the mask Undo can put back keeps the draft, and a script's input is masked again. */
function onInput(event: Event & { currentTarget: HTMLInputElement }): void {
	const field = event.currentTarget
	const next = draftAfterInput(typed, field.value)
	const refused = next !== field.value
	session.values[row.id] = next
	if (masked || refused) field.value = shown
}
</script>

<!-- One account: its last Balance, the date of its last Transaction, and a field for today's value. -->
<li class="min-w-0 space-y-1.5 py-3 {changed ? 'border-l-2 border-foreground pl-3' : ''}" data-changed={changed ? "true" : undefined}>
	<div class="flex items-baseline justify-between gap-3">
		<label for="value-{row.id}" class="min-w-0 truncate text-sm font-medium text-foreground">{row.name}</label>
		<span class="shrink-0 text-sm">
			{#if row.balance !== null}<Money amount={row.balance} currency={row.currency} />{:else}<span class="text-muted-foreground">No balance</span>{/if}
		</span>
	</div>
	<p class="text-xs text-muted-foreground">{lastLine(row, since)}</p>
	<input
		id="value-{row.id}"
		value={shown}
		oninput={onInput}
		onfocus={() => (focused = true)}
		onblur={(event) => {
			// A blur while the field is still active is the window losing focus, so the digits stay shown.
			if (!lostWindow(event.currentTarget)) focused = false
		}}
		use:maskedFocus={() => preferences.hidden && changed}
		inputmode="decimal"
		autocomplete="off"
		aria-invalid={problem ? "true" : undefined}
		aria-describedby={describedBy}
		class="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus-visible:outline-2 focus-visible:outline-ring"
	/>
	{#if masked}<span id="value-{row.id}-masked" class="sr-only">Amount hidden. Select the field to see and edit it.</span>{/if}
	{#if row.owed}<p id="value-{row.id}-owed" class="text-xs text-muted-foreground">{OWED_HINT}</p>{/if}
	{#if problem}<p id="value-{row.id}-problem" role="alert" class="text-sm text-destructive">{problem}</p>{/if}
</li>
