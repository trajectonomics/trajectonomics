<script lang="ts">
import { editSession, STALE_PLAN } from "../../client/edit.svelte.js"
import { focusWhenSeen } from "../../client/focus.js"
import { focusReloaded } from "../../client/refused-focus.js"
import { WRITTEN_REREAD_FAILED_MESSAGE } from "../../lib/edit/failure"
import { isActionSource } from "../../lib/view/action-source"
import { type NoticeShows, noticeCase } from "../../lib/view/stale-notice"

interface Props {
	/** Which cases this copy says: both, only the plan moved on beside an inline form, or only the landed write above the page. */
	shows?: NoticeShows
	/** The inline action this copy sits beside (`actionSource`). Without one, the copy says no inline action's refusal. */
	source?: string
}

let { shows = "both", source }: Props = $props()
/** This copy's own name: a page can show two copies, and only the one whose Reload was pressed says why it failed. */
const id = $props.id()
const failed = $derived(editSession.reloadFrom === id ? editSession.reloadError : null)
const button =
	"rounded-md border border-border bg-card px-3 py-1.5 text-sm text-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-disabled:opacity-50"
const mine = $derived(
	source === undefined ? !isActionSource(editSession.source) : source === editSession.source,
)
const notice = $derived(noticeCase(shows, editSession.stale && mine, editSession.savedUnread))
// Each write that lands unread makes the alert anew, so it is read out and takes focus again.
const landing = $derived(notice === "landed" ? editSession.landings : 0)
let box: HTMLDivElement | undefined = $state()

/** Reads the Snapshot again. The notice goes with it, so focus is handed on to its drawer or the page; a failure stays here. */
async function reload(): Promise<void> {
	const place = box?.closest<HTMLElement>("dialog, main") ?? null
	await focusReloaded(place, await editSession.reload(id))
}

// A save that could not be answered with a fresh Snapshot fills this notice: focus moves to it, so a keyboard
// reader lands on Reload. While a drawer that does not hold this copy is open, it waits for the drawer to close.
$effect(() => {
	if (notice === null || box === undefined) return
	return focusWhenSeen(box)
})
</script>

<!-- Shown when a save could not be answered with a fresh Snapshot: the CLI refused it over a plan that changed,
or the write landed and the Snapshot read that answers it failed. Reload reads the Snapshot again, and the copy
that was pressed says why when it cannot. Its button is only marked disabled while a request runs, so it keeps keyboard focus. -->
{#if notice !== null}
	{#key landing}
		<div bind:this={box} role="alert" tabindex="-1" class="space-y-3 rounded-md border border-border bg-muted p-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
			<p class="text-sm text-foreground">{notice === "stale" ? STALE_PLAN : WRITTEN_REREAD_FAILED_MESSAGE}</p>
			{#if failed !== null}<p class="text-sm text-destructive wrap-anywhere">{failed}</p>{/if}
			<button type="button" onclick={reload} aria-disabled={editSession.busy} class={button}>Reload</button>
		</div>
	{/key}
{/if}
