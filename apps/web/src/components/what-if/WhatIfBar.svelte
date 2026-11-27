<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import { selectPlan } from "../../client/select-plan.svelte.js"
import { whatIfSession } from "../../client/what-if.svelte.js"
import WhatIfActions from "./WhatIfActions.svelte"
import WhatIfChanges from "./WhatIfChanges.svelte"
import WhatIfNotices from "./WhatIfNotices.svelte"

/** The plan a pending switch goes to: the changes of this session are dropped, and the switch runs. */
function switchNow(): void {
	const name = whatIfSession.revertAndSwitch()
	if (name !== null) void selectPlan(name)
}

let question: HTMLDivElement | undefined = $state()
/** The control that had focus when the question came; Stay returns the person to it. */
let returnTo: HTMLElement | null = null

// A question takes the screen: it scrolls into view and takes focus, since the bar sits at the top of the page and the
// link that asked may be far below it. Its scroll margin clears the sticky top bar.
$effect(() => {
	if (whatIfSession.asking === null || question === undefined) return
	returnTo = document.activeElement instanceof HTMLElement ? document.activeElement : null
	question.scrollIntoView({ block: "nearest" })
	question.focus({ preventScroll: true })
})

/** Keeps the changes, closes the question, and puts the focus back on the control that asked. */
function stay(): void {
	whatIfSession.stay()
	returnTo?.focus()
}
</script>

<!-- The What-if session's bar, under the top bar: shown only while the session holds at least one change, and the server answers. -->
{#if whatIfSession.whatIf !== null && whatIfSession.active && editSession.token !== null}
	<section aria-label="What-if session" class="print:hidden border-b border-border bg-card">
		<div class="mx-auto w-full max-w-6xl space-y-3 px-4 py-3 sm:px-6">
			<p class="text-sm">
				<span class="font-semibold">What-if</span> on plan {whatIfSession.whatIf.plan}
			</p>
			<WhatIfChanges />
			<WhatIfNotices />
			{#if whatIfSession.asking !== null}
				<div bind:this={question} role="alert" tabindex="-1" class="scroll-mt-20 flex flex-wrap items-center gap-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
					<span>Switching to {whatIfSession.asking} drops the changes on {whatIfSession.whatIf.plan}.</span>
					<button type="button" onclick={switchNow} disabled={whatIfSession.saving} class="underline disabled:opacity-50">Revert and switch</button>
					<button type="button" onclick={stay} class="underline">
						Stay on {whatIfSession.whatIf.plan}
					</button>
				</div>
			{/if}
			<WhatIfActions />
		</div>
	</section>
{/if}
