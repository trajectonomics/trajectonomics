<script lang="ts">
import { routing } from "../../client/routing.svelte.js"
import { accountOptions, ILLIQUID_NOTE, routableAccounts } from "../../lib/view/routing/accounts"
import type { RoutingContext } from "../../lib/view/routing/context"
import { STEP_CHOICES } from "../../lib/view/routing/options"
import { STEP_FIELDS, shownForRow } from "../../lib/view/routing/shown"
import {
	lastStepProblem,
	stepDraftOf,
	stepFromDraft,
	withStep,
} from "../../lib/view/routing/surplus"
import Field from "../plan-items/Field.svelte"
import ItemActions from "../plan-items/ItemActions.svelte"
import TargetFields from "./TargetFields.svelte"

interface Props {
	ctx: RoutingContext
	/** The step to change by its position, or null for a new one. */
	index: number | null
	/** True when the drawer tries a value in the What-if session, starting from the session's own steps. */
	tryValue: boolean
	onDone: () => void
}

let { ctx, index, tryValue, onDone }: Props = $props()
/** The steps the form starts from: the session's own while a value is tried, so a new try carries the earlier ones. */
const base = () => (tryValue ? ctx.shown : ctx.doc).cashflow?.surplus ?? []
const existing = () => (index === null ? undefined : base()[index])
let draft = $state(stepDraftOf(existing()))
let problems: Record<string, string> = $state({})
let sentAt: number | null = $state(null)
const shown = $derived(
	shownForRow(problems, routing.place, routing.formMessage, {
		list: "surplus",
		sentAt,
		fields: STEP_FIELDS,
	}),
)
const options = $derived(
	accountOptions(
		routableAccounts(ctx.doc, ctx.names),
		draft.account,
		ctx.names,
		"Choose an account",
	),
)

async function submit(event: SubmitEvent): Promise<void> {
	event.preventDefault()
	routing.clear()
	const made = stepFromDraft(draft, existing())
	if (!made.ok) {
		problems = made.problems
		return
	}
	const items = withStep(base(), index, made.step)
	const rule = lastStepProblem(items)
	problems = rule === null ? {} : { general: rule.message }
	if (rule !== null) return
	sentAt = items.indexOf(made.step)
	const change = { kind: "list", list: "surplus", items } as const
	if (tryValue ? routing.tryIt(ctx, change) : await routing.save(ctx, change)) onDone()
}
</script>

<form onsubmit={submit} class="space-y-5" aria-label={index === null ? "Add a step" : "Change a step"}>
	<Field id="step-account" label="Account" hint={ILLIQUID_NOTE} {options} bind:value={draft.account} problem={shown.at("account")} />
	<Field id="step-how" label="How much" options={STEP_CHOICES} bind:value={draft.how} />
	{#if draft.how === "share" || draft.how === "shareUpTo"}
		<Field id="step-share" label="Share of what is left" inputmode="decimal" hint="A percent with at most two places, such as 30" bind:value={draft.share} problem={shown.at("share")} />
	{/if}
	{#if draft.how === "upTo" || draft.how === "shareUpTo"}
		<TargetFields bind:draft id="step" label="Up to" problem={shown.at("amount")} rateProblem={shown.at("rate")} />
	{/if}
	{#if shown.general}<p role="alert" class="text-sm text-destructive">{shown.general}</p>{/if}
	<ItemActions kind="account" trying={tryValue} />
</form>
