<script lang="ts">
import { routing } from "../../client/routing.svelte.js"
import { accountOptions, ILLIQUID_NOTE, routableAccounts } from "../../lib/view/routing/accounts"
import type { RoutingContext } from "../../lib/view/routing/context"
import { ENTRY_FIELDS, shownForRow } from "../../lib/view/routing/shown"
import { entryDraftOf, entryFromDraft, withEntry } from "../../lib/view/routing/withdraw"
import Field from "../plan-items/Field.svelte"
import ItemActions from "../plan-items/ItemActions.svelte"
import TargetFields from "./TargetFields.svelte"

interface Props {
	ctx: RoutingContext
	/** The entry to change by its position, or null for a new one. */
	index: number | null
	tryValue: boolean
	onDone: () => void
}

let { ctx, index, tryValue, onDone }: Props = $props()
const base = () => (tryValue ? ctx.shown : ctx.doc).cashflow?.withdraw ?? []
const existing = () => (index === null ? undefined : base()[index])
let draft = $state(entryDraftOf(existing()))
let problems: Record<string, string> = $state({})
let sentAt: number | null = $state(null)
const shown = $derived(
	shownForRow(problems, routing.place, routing.message, {
		list: "withdraw",
		sentAt,
		fields: ENTRY_FIELDS,
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
	const made = entryFromDraft(draft, existing())
	problems = made.ok ? {} : made.problems
	if (!made.ok) return
	const items = withEntry(base(), index, made.entry)
	sentAt = index ?? items.lastIndexOf(made.entry)
	const change = { kind: "list", list: "withdraw", items } as const
	if (tryValue ? routing.tryIt(ctx, change) : await routing.save(ctx, change)) onDone()
}
</script>

<form onsubmit={submit} class="space-y-5" aria-label={index === null ? "Add an entry" : "Change an entry"}>
	<Field id="entry-account" label="Take from" hint={ILLIQUID_NOTE} {options} bind:value={draft.account} problem={shown.at("account")} />
	<label class="flex items-center gap-2 text-sm text-foreground">
		<input type="checkbox" bind:checked={draft.floor} class="size-4" />
		Keep a reserve in it: stop taking from it at a floor
	</label>
	{#if draft.floor}
		<TargetFields bind:draft id="entry" label="Down to" problem={shown.at("amount")} rateProblem={shown.at("rate")} />
		<p class="text-xs text-muted-foreground">A floor adds a later entry that takes the rest of this account, so the money under the floor is still there to use once the other entries are used up. Remove that entry to keep the floor for good.</p>
	{/if}
	{#if shown.general}<p role="alert" class="text-sm text-destructive">{shown.general}</p>{/if}
	<ItemActions trying={tryValue} />
</form>
