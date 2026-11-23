<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import { preferences } from "../../client/preferences.svelte.js"
import { currentSnapshot } from "../../client/snapshot.svelte.js"
import { whatIfSession } from "../../client/what-if.svelte.js"
import { maskMoney } from "../../lib/format/mask"
import { accountNameOf } from "../../lib/view/withdrawals/context"
import { tryWords } from "../../lib/view/withdrawals/try-words"
import { failedReads, pathNamed } from "../../lib/what-if/answer"
import { type Change } from "../../lib/what-if/session"
import NavIcon from "../shell/NavIcon.svelte"

const refusals = $derived(
	whatIfSession.answer === null
		? []
		: failedReads(whatIfSession.answer).map((failed) => ({
				path: pathNamed(failed.error),
				message: failed.error.message,
			})),
)

/** The refusal that names a change, if one does. */
function refusalOf(change: Change): string | null {
	return refusals.find((refusal) => refusal.path === change.path)?.message ?? null
}

const baseline = $derived.by(() => {
	const state = currentSnapshot()
	return state.status === "ready" ? state.snapshot.reads.baseline : undefined
})

/** A change's words as the bar shows them: a Set's value is masked when the person hides amounts. */
function wordsOf(change: Change): string {
	if (change.kind === "flow") return tryWords(change, (id) => accountNameOf(id, baseline))
	if (change.kind !== "set" || !preferences.hidden) return change.label
	// A Set's label ends with its value as typed, so the value's place is masked and the rest kept.
	return `${change.label.slice(0, change.label.length - change.value.length)}${maskMoney(change.value)}`
}
</script>

<!-- The changes of the session, one per line: a remove control each, and a refusal at the change it names. -->
<ul class="space-y-1.5 text-sm">
	{#each whatIfSession.changes as change (change.path + change.kind)}
		<li class="flex flex-wrap items-center gap-2">
			<span title={change.kind === "add" ? change.title : undefined}>{wordsOf(change)}</span>
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
