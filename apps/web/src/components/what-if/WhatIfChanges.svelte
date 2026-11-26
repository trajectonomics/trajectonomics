<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import { preferences } from "../../client/preferences.svelte.js"
import { currentSnapshot } from "../../client/snapshot.svelte.js"
import { whatIfSession } from "../../client/what-if.svelte.js"
import { maskMoney } from "../../lib/format/mask"
import { itemText, NO_ITEM_NAMES, snapshotItemNames } from "../../lib/view/item-names"
import { tryWords } from "../../lib/view/withdrawals/try-words"
import { failedReads, pathNamed } from "../../lib/what-if/answer"
import { labelWithNames } from "../../lib/what-if/change-names"
import { type Change, namesChange } from "../../lib/what-if/session"
import NavIcon from "../shell/NavIcon.svelte"

const refusals = $derived(
	whatIfSession.answer === null
		? []
		: failedReads(whatIfSession.answer).map((failed) => ({
				path: pathNamed(failed.error),
				message: failed.error.message,
			})),
)

/** The refusal that names a change, or a part of the loan or asset it groups, if one does. */
function refusalOf(change: Change): string | null {
	return (
		refusals.find((refusal) => refusal.path !== null && namesChange(change, refusal.path))
			?.message ?? null
	)
}

/**
 * The names of the session's own plan. The bar words a change by the plan it is made against, which the session holds;
 * the address may name another plan, so the page's `currentItemNames()` would name it by the wrong one's labels.
 */
const names = $derived.by(() => {
	const state = currentSnapshot()
	const plan = whatIfSession.whatIf?.plan
	return state.status !== "ready" || plan === undefined
		? NO_ITEM_NAMES
		: snapshotItemNames(state.snapshot, plan)
})

/** Whether a Set changes a figure, which hiding amounts masks. A Milestone's id or name is not a figure. */
function isFigure(change: Change): change is Extract<Change, { kind: "set" }> {
	if (change.kind !== "set") return false
	const field = change.path.slice(change.path.lastIndexOf(".") + 1)
	return field !== "startAt" && field !== "endAt"
}

/** A change's words as the bar shows them: a Set of a figure is masked when the person hides amounts. */
function wordsOf(change: Change): string {
	const label = labelWithNames(change, names)
	if (change.kind === "flow") {
		const accountText = (id: string) => itemText(names, "account", id)
		const flowText = (id: string) => itemText(names, "flow", id)
		return tryWords({ ...change, label }, accountText, flowText)
	}
	if (!isFigure(change) || !preferences.hidden) return label
	// A figure's label ends with its value as typed, so the value's place is masked and the rest kept.
	return `${label.slice(0, label.length - change.value.length)}${maskMoney(change.value)}`
}
</script>

<!-- The changes of the session, one per line: a remove control each, and a refusal at the change it names. -->
<ul class="space-y-1.5 text-sm">
	{#each whatIfSession.changes as change (change.path + change.kind)}
		<li class="flex flex-wrap items-center gap-2">
			<span class="min-w-0 wrap-anywhere" title={change.kind === "add" ? change.title : undefined}>{wordsOf(change)}</span>
			{#if refusalOf(change) !== null}
				<span role="alert" class="text-destructive">{refusalOf(change)}</span>
			{/if}
			<button
				type="button"
				aria-label="Remove this change"
				onclick={() => whatIfSession.removeChange(change)}
				disabled={editSession.busy}
				class="ml-auto inline-flex rounded-md p-1 text-muted-foreground outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
			>
				<NavIcon name="x" />
			</button>
		</li>
	{/each}
</ul>
