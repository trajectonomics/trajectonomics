<script lang="ts">
import type { ProjectionRun, Read } from "../../lib/contract"
import { chooseScenario } from "../../lib/view/plan"
import { parseTerms } from "../../lib/view/projection/terms"
import ProjectionResult from "../projection/ProjectionResult.svelte"
import TermsControl from "../projection/TermsControl.svelte"
import EmptyState from "../ui/EmptyState.svelte"
import PageShell from "../ui/PageShell.svelte"
import ReadView from "../ui/ReadView.svelte"
import SiteLink from "../ui/SiteLink.svelte"

interface Props {
	/** The Scenario the address bar asks for. */
	scenario: string
	/** The terms the address bar asks for, and the setter that writes them. */
	terms: string
	onTerms: (value: string) => void
}

/** The year tables of one plan, exactly as the CLI states them, and its statement. */
let { scenario, terms, onTerms }: Props = $props()
</script>

<PageShell
	title="Year by year"
>
	{#snippet children(snapshot)}
		{@const name = chooseScenario(snapshot.params.scenarios, scenario)}
		{@const read: Read<ProjectionRun> | undefined =
			name === null ? undefined : snapshot.reads.projections[name]}
		<div class="flex flex-wrap items-center justify-between gap-3">
			<SiteLink
				href="/projection/"
				class="text-sm text-accent underline-offset-4 hover:underline print:hidden"
			>
				← Plan
			</SiteLink>
			<TermsControl value={parseTerms(terms)} onChange={onTerms} />
		</div>
		{#if name === null || read === undefined}
			<EmptyState title="No plan to project" />
		{:else}
			<ReadView {read} label={`Projection of ${name}`}>
				{#snippet children(run)}<ProjectionResult {run} argv={read.argv} />{/snippet}
			</ReadView>
		{/if}
	{/snippet}
</PageShell>
