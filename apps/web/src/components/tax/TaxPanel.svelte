<script lang="ts">
import type { ProjectionRun, Read } from "../../lib/contract"
import { resolveScenario } from "../../lib/view/tax"
import EmptyState from "../ui/EmptyState.svelte"
import Provenance from "../ui/Provenance.svelte"
import ReadView from "../ui/ReadView.svelte"
import SegmentedControl from "../ui/SegmentedControl.svelte"
import TaxBodyView from "./TaxBodyView.svelte"

interface Props {
	/** The Projections by Scenario name; their names are the choices of the picker. */
	projections: Readonly<Record<string, Read<ProjectionRun>>>
	/** The Scenario the address bar asks for; empty or unknown falls back to the first one. */
	requested: string
	onScenario: (name: string) => unknown
}

let { projections, requested, onScenario }: Props = $props()
const names = $derived(Object.keys(projections))
const options = $derived(names.map((value) => ({ value, label: value })))
const resolved = $derived(resolveScenario(names, requested))
const name = $derived(resolved.name)
const read = $derived(name === null ? undefined : projections[name])
</script>

<!-- The Tax page's body: a Scenario picker, then the chosen Scenario's tax years or its empty state. -->
{#snippet taxScenario(scenario: string, scenarioRead: Read<ProjectionRun>)}
	<div class="space-y-8">
		<ReadView read={scenarioRead} label={`The tax of ${scenario}`}>
			{#snippet children(run)}
				<TaxBodyView name={scenario} {run} />
			{/snippet}
		</ReadView>
		<Provenance argv={scenarioRead.argv} />
	</div>
{/snippet}

{#if name === null}
	<EmptyState title="No Scenario to read" />
{:else}
	<div class="space-y-8">
		<SegmentedControl name="scenario" label="Scenario" {options} value={name} onChange={onScenario} />
		{#if resolved.unknown !== null}
			<p role="status" class="text-sm text-muted-foreground">
				There is no Scenario named {resolved.unknown}. Showing {name}.
			</p>
		{/if}
		{#if read === undefined}
			<EmptyState title="No Projection to read" />
		{:else}
			{@render taxScenario(name, read)}
		{/if}
	</div>
{/if}
