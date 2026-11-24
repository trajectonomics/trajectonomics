<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import { importSession as session } from "../../client/import-values.svelte.js"
import { valueSheetSession } from "../../client/record-values.svelte.js"
import { RECORD_VALUES_MAX_ROWS } from "../../lib/edit/record-values"
import type { ImportPlan } from "../../lib/view/import-values/plan"
import { planLine } from "../../lib/view/import-values/words"
import type { ValueSheet } from "../../lib/view/record-values/types"
import PreviewResult from "./PreviewResult.svelte"
import ReviewAgainst from "./ReviewAgainst.svelte"
import { BUTTON, PRIMARY } from "./styles"

interface Props {
	plan: ImportPlan
	sheet: ValueSheet
}

let { plan, sheet }: Props = $props()
const preview = $derived(session.preview)
const against = $derived(
	sheet.choices.find((choice) => choice.id === valueSheetSession.against) ?? null,
)
const ready = $derived(preview.state === "ready" && !editSession.busy)
const refusedAgainst = $derived(preview.state === "refused" ? preview.refusal.against : undefined)
</script>

<!-- Step 3: what will be recorded, and traj's dry run of it. Import runs the same Edit for real; nothing is written before. -->
<div class="min-w-0 space-y-5">
	<p class="text-sm font-medium text-foreground">{planLine(plan.sent.length, plan.earliest, plan.latest)}</p>
	{#if plan.tooMany}
		<p role="alert" class="text-sm text-destructive">That is more than the {RECORD_VALUES_MAX_ROWS} values one import may hold. Go back and import fewer accounts or a shorter range of dates at a time.</p>
	{/if}
	<ReviewAgainst {sheet} {plan} problem={refusedAgainst} />
	<PreviewResult {preview} askable={against === null && !plan.tooMany} />
	<div class="flex flex-wrap gap-2">
		<button type="button" disabled={!ready} onclick={() => void session.commit(plan, sheet)} class={PRIMARY}>Import</button>
		<button type="button" onclick={() => session.back()} class={BUTTON}>Back</button>
		<button type="button" onclick={() => session.cancel()} class={BUTTON}>Cancel</button>
	</div>
</div>
