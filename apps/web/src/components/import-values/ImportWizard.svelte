<script lang="ts">
import { importSession as session } from "../../client/import-values.svelte.js"
import { targetsOf } from "../../lib/view/import-values/match"
import { parseImport } from "../../lib/view/import-values/parse"
import { importPlan } from "../../lib/view/import-values/plan"
import { stepLine } from "../../lib/view/import-values/steps"
import type { ValueSheet } from "../../lib/view/record-values/types"
import Drawer from "../ui/Drawer.svelte"
import ImportDone from "./ImportDone.svelte"
import LoadStep from "./LoadStep.svelte"
import MatchStep from "./MatchStep.svelte"
import ReviewStep from "./ReviewStep.svelte"

interface Props {
	sheet: ValueSheet
}

let { sheet }: Props = $props()
const parsed = $derived(parseImport(session.text, session.layout))
const targets = $derived(targetsOf(sheet))
const plan = $derived(importPlan(parsed, session.matches))
</script>

<!-- Three steps in one drawer: Load, Match, Review. Cancel, the close button and Escape all discard the draft. -->
<Drawer open={session.open} title="Import a balance history" onClose={() => session.cancel()} locked={session.committing} backdropCloses={session.text.trim() === ""}>
	<div class="min-w-0 space-y-6">
		{#if session.step !== "done"}
			<p class="text-sm text-muted-foreground">{stepLine(session.step)}</p>
		{/if}
		{#if session.step === "load"}
			<LoadStep {parsed} {targets} />
		{:else if session.step === "match"}
			<MatchStep {parsed} {targets} {plan} {sheet} />
		{:else if session.step === "review"}
			<ReviewStep {plan} {sheet} />
		{:else}
			<ImportDone {plan} />
		{/if}
	</div>
</Drawer>
