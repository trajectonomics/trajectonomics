<script lang="ts">
import { editSession } from "../../client/edit.svelte.js"
import { currentSearch } from "../../client/location.svelte.js"
import { whatIfSession } from "../../client/what-if.svelte.js"
import type { Snapshot } from "../../lib/contract"
import { editsShown } from "../../lib/edit/shown"
import { estateDates, estateView } from "../../lib/view/estate"
import { noCostNote } from "../../lib/view/estate/notes"
import { parseTerms } from "../../lib/view/projection/terms"
import EmptyState from "../ui/EmptyState.svelte"
import ReadView from "../ui/ReadView.svelte"
import EstateActions from "./EstateActions.svelte"
import EstateAssumptions from "./EstateAssumptions.svelte"
import EstateControls from "./EstateControls.svelte"
import EstateResult from "./EstateResult.svelte"

interface Props {
	snapshot: Snapshot
	name: string
	terms: string
	onTerms: (value: string) => void
	at: string
	onAt: (value: string) => void
}

let { snapshot, name, terms, onTerms, at, onAt }: Props = $props()
const editable = $derived(editsShown(editSession.token, currentSearch()))
const chosen = $derived(parseTerms(terms))
const doc = $derived(snapshot.reads.documents[name])
const run = $derived(snapshot.reads.projections[name])
const lens = $derived(whatIfSession.lensFor(name))
const plan = $derived(doc?.ok ? doc.data.scenario.document : null)
const household = $derived(doc?.ok ? doc.data.scenario.household : null)
const dates = $derived(run?.ok && plan ? estateDates(run.data, plan, household, at) : null)
const saved = $derived(run?.ok && dates ? estateView(run.data, dates.chosen.date, chosen) : null)
const tried = $derived(lens?.run && dates ? estateView(lens.run, dates.chosen.date, chosen) : null)
const note = $derived(plan === null ? null : noCostNote(plan))
</script>

<!-- One plan: what heirs would receive on a date, where the rest goes, and the lines the person set; a what-if shows both. -->
<div class="space-y-8">
	{#if editable && doc?.ok && plan}
		<EstateActions {name} contentHash={doc.data.scenario.contentHash} {plan} />
	{/if}
	{#if run === undefined}
		<EmptyState title="No projection in this Snapshot" />
	{:else}
		<ReadView read={run} label={`The estate of ${name}`}>
			{#snippet children()}
				{#if dates === null || saved === null}
					<EmptyState title="No estate in this Snapshot" />
				{:else}
					<EstateControls {dates} {terms} {onTerms} {onAt} />
					{#if tried}<EstateResult view={tried} terms={chosen} title="With your try" />{/if}
					<EstateResult view={saved} terms={chosen} title={tried ? "Saved plan" : undefined} />
					{#if plan}<EstateAssumptions {plan} {note} baseline={snapshot.reads.baseline} />{/if}
				{/if}
			{/snippet}
		</ReadView>
	{/if}
</div>
