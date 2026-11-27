<script lang="ts">
import { whatIfSession } from "../../client/what-if.svelte.js"
import type { ProjectionChance, Read } from "../../lib/contract"
import { futuresViewOf } from "../../lib/view/chance/futures"
import { chanceViewOf } from "../../lib/view/chance/page"
import { chooseScenario } from "../../lib/view/plan"
import EmptyState from "../ui/EmptyState.svelte"
import ReadView from "../ui/ReadView.svelte"
import SegmentedControl from "../ui/SegmentedControl.svelte"
import SiteLink from "../ui/SiteLink.svelte"
import ChanceWhatIf from "../what-if/ChanceWhatIf.svelte"
import ChanceResult from "./ChanceResult.svelte"

interface Props {
	/** The Scenarios the Snapshot planned, main first; the plan switcher's choices. */
	names: readonly string[]
	/** The chance reads of the Snapshot, by Scenario name. */
	chance: Readonly<Record<string, Read<ProjectionChance>>>
	/** The Scenario the plan switcher asks for. An unknown one shows the first. */
	scenario: string
	onScenario: (value: string) => unknown
}

/** The Scenario picker and the chance of the chosen Scenario. The choice lives in the address bar. */
let { names, chance, scenario, onScenario }: Props = $props()
const name = $derived(chooseScenario(names, scenario))
const read = $derived(name === null ? undefined : chance[name])
const lens = $derived(name === null ? null : whatIfSession.lensFor(name))
const options = $derived(names.map((value) => ({ value, label: value })))
</script>

{#if name === null || read === undefined}
	<EmptyState title="No chance of success in this Snapshot">
		<p>
			Set the market paths and the seed on <SiteLink href="/settings/assumptions/" class="underline">Assumptions</SiteLink>,
			or start the Dashboard with <code>--paths N</code> and <code>--seed HEX</code>. The chance is built from your plan's own
			returns and swings; a Return model file given with <code>--return-model FILE</code> is used instead. The CLI ships no model.
		</p>
	</EmptyState>
{:else}
	<div class="space-y-6">
		<SegmentedControl
			name="scenario"
			label="Plan"
			{options}
			value={name}
			onChange={onScenario}
		/>
		{#if lens}<ChanceWhatIf {lens} baseline={read.ok ? read.data : null} />{/if}
		<ReadView {read} label={`Chance of success for ${name}`}>
			{#snippet children(data)}
				<ChanceResult view={chanceViewOf(data)} argv={read.argv} plan={name} futures={futuresViewOf(data)} />
			{/snippet}
		</ReadView>
	</div>
{/if}
