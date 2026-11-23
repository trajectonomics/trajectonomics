<script lang="ts">
import { whatIfSession } from "../../client/what-if.svelte.js"
import type { ProjectionChance, Read } from "../../lib/contract"
import { chanceViewOf } from "../../lib/view/chance/page"
import { chooseScenario, projectionNames } from "../../lib/view/projection/scenario"
import EmptyState from "../ui/EmptyState.svelte"
import ReadView from "../ui/ReadView.svelte"
import SegmentedControl from "../ui/SegmentedControl.svelte"
import ChanceWhatIf from "../what-if/ChanceWhatIf.svelte"
import ChanceResult from "./ChanceResult.svelte"

interface Props {
	/** The chance reads of the Snapshot, by Scenario name. */
	chance: Readonly<Record<string, Read<ProjectionChance>>>
	/** The Scenario the plan switcher asks for. An unknown one shows the first. */
	scenario: string
	onScenario: (value: string) => unknown
}

/** The Scenario picker and the chance of the chosen Scenario. The choice lives in the address bar. */
let { chance, scenario, onScenario }: Props = $props()
const names = $derived(projectionNames(chance))
const name = $derived(chooseScenario(names, scenario))
const read = $derived(name === null ? undefined : chance[name])
const lens = $derived(name === null ? null : whatIfSession.lensFor(name))
const options = $derived(names.map((value) => ({ value, label: value })))
</script>

{#if name === null || read === undefined}
	<EmptyState title="No chance of success in this Snapshot">
		<p>
			Add a Return model to read it: pass <code>--return-model FILE</code>,
			<code>--paths N</code> and <code>--seed HEX</code> together, to
			<code>bun run snapshot</code>, <code>bun run dashboard</code> or <code>traj dashboard</code>.
			The file is a Return model in the sim format; <code>traj schema projection chance</code>
			describes it. The CLI ships none.
		</p>
	</EmptyState>
{:else}
	<div class="space-y-6">
		<SegmentedControl
			name="scenario"
			label="Scenario"
			{options}
			value={name}
			onChange={onScenario}
		/>
		{#if lens}<ChanceWhatIf {lens} baseline={read.ok ? read.data : null} />{/if}
		<ReadView {read} label={`Chance of success for ${name}`}>
			{#snippet children(data)}
				<ChanceResult view={chanceViewOf(data)} argv={read.argv} />
			{/snippet}
		</ReadView>
	</div>
{/if}
