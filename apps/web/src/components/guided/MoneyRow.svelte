<script lang="ts">
import { maskedFocus } from "../../client/masked-focus.js"
import { preferences } from "../../client/preferences.svelte.js"
import { draftAfterInput, formatMoney, maskMoney } from "../../lib/format"
import type { GuidedMoneyRow } from "../../lib/view/guided/money"
import type { RowDraft } from "../../lib/view/guided/money-draft"
import Badge from "../ui/Badge.svelte"
import { INPUT, PROBLEM } from "./styles"

interface Props {
	row: GuidedMoneyRow
	draft: RowDraft
	/** The problem at this row's amount, or null. */
	problem: string | null
	/** Whether Next found a problem, so the amount shows its own. */
	showProblems: boolean
	onKeep: (keep: boolean) => void
	onAmount: (amount: string) => void
	onEarned: (earned: boolean) => void
}

let { row, draft, problem, showProblems, onKeep, onAmount, onEarned }: Props = $props()
/** The CLI's amount behind the hide-amounts mask, in the field until a number is typed. */
const stated = $derived(formatMoney(row.amount))
let focused = $state(false)
/** The hint the field shows: masked while it is not focused, and the CLI's amount on focus, so the person reads it. */
const placeholder = $derived(preferences.hidden && !focused ? maskMoney(stated) : stated)
let touched = $state(false)
/** True while the digits show as the mask: a focused field shows the real value, so the person can edit it. */
const masked = $derived(preferences.hidden && !focused && draft.amount.trim() !== "")
const shown = $derived(masked ? maskMoney(draft.amount) : draft.amount)
/** A dropped row holds no amount, so it shows no problem: its field is off and the CLI never reads it. */
const shownProblem = $derived(
	problem !== null && draft.keep && (showProblems || touched) ? problem : null,
)
const described = $derived(
	[
		shownProblem ? `guided-amount-${row.id}-problem` : undefined,
		masked ? `guided-amount-${row.id}-masked` : undefined,
	]
		.filter((one) => one !== undefined)
		.join(" ") || undefined,
)

/** The draft a typed amount makes. Undo can put the mask back, which is no amount, so it keeps the draft and the field. */
function onInput(event: Event & { currentTarget: HTMLInputElement }): void {
	const field = event.currentTarget
	const typed = field.value
	const next = draftAfterInput(draft.amount, typed)
	const caret = (field.selectionStart ?? typed.length) - (typed.length - next.length)
	touched = true
	onAmount(next)
	if (next !== typed) {
		field.value = shown
		field.setSelectionRange(caret, caret)
	}
}
</script>

<!-- One Account: kept or dropped, the CLI's amount, its frequency, and for income the stop-work and tax facts. -->
<li class="space-y-2 py-3">
	<div class="flex flex-wrap items-center gap-x-3 gap-y-1.5">
		<input id="guided-keep-{row.id}" type="checkbox" checked={draft.keep}
			aria-label="Keep {row.name}"
			onchange={(event) => onKeep(event.currentTarget.checked)} />
		<label for="guided-keep-{row.id}" class="text-sm text-foreground">Keep</label>
		<label for="guided-amount-{row.id}" class="min-w-0 text-sm font-medium text-foreground">{row.name}</label>
	</div>
	<div class="flex flex-wrap items-center gap-2">
		<input id="guided-amount-{row.id}" class={INPUT} value={shown} {placeholder}
			inputmode="decimal" autocomplete="off" disabled={!draft.keep}
			use:maskedFocus={() => preferences.hidden && draft.amount.trim() !== ""}
			onfocus={() => (focused = true)}
			onblur={() => {
				focused = false
				touched = true
			}}
			aria-invalid={shownProblem ? "true" : undefined}
			aria-describedby={described}
			oninput={onInput} />
		<span class="text-sm text-muted-foreground">{row.frequency === "yearly" ? "per year" : "per month"}</span>
	</div>
	{#if masked}<span id="guided-amount-{row.id}-masked" class="sr-only">Amount hidden. Select the field to see and edit it.</span>{/if}
	{#if shownProblem}<p id="guided-amount-{row.id}-problem" role="alert" class={PROBLEM}>{shownProblem}</p>{/if}
	{#if row.type === "income"}
		<div class="flex flex-wrap items-center gap-2 text-sm">
			<input id="guided-stops-{row.id}" type="checkbox" checked={draft.earned}
				aria-label="Stops when I stop working: {row.name}"
				onchange={(event) => onEarned(event.currentTarget.checked)} />
			<label for="guided-stops-{row.id}" class="text-foreground">Stops when I stop working</label>
			<Badge>No tax label yet</Badge>
		</div>
	{/if}
</li>
