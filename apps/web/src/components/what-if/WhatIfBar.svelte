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
				<div role="alert" class="flex flex-wrap items-center gap-3 text-sm">
					<span>Switching to {whatIfSession.asking} drops the changes on {whatIfSession.whatIf.plan}.</span>
					<button type="button" onclick={switchNow} disabled={whatIfSession.saving} class="underline disabled:opacity-50">Revert and switch</button>
					<button type="button" onclick={() => whatIfSession.stay()} class="underline">
						Stay on {whatIfSession.whatIf.plan}
					</button>
				</div>
			{/if}
			<WhatIfActions />
		</div>
	</section>
{/if}
