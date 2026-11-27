<script lang="ts">
import type { Snapshot } from "../../lib/contract"
import { hasLevy } from "../../lib/snapshot"
import { chooseScenario } from "../../lib/view/plan"
import { addLevyCommand } from "../../lib/view/tax"
import EmptyState from "../ui/EmptyState.svelte"
import AllowancesPlan from "./AllowancesPlan.svelte"

interface Props {
	snapshot: Snapshot
	/** The plan the address bar asks for. */
	scenario: string
}

let { snapshot, scenario }: Props = $props()
const name = $derived(chooseScenario(snapshot.params.scenarios, scenario))
</script>

{#if name === null}
	<EmptyState title="No plan to read" />
{:else if !hasLevy(snapshot.reads.documents[name])}
	<EmptyState title="No tax rules in this plan">
		<p>Allowances lower a plan's tax, so the plan needs tax rules. Add Thailand's with:</p>
		<pre class="mt-3 overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs text-foreground"><code>{addLevyCommand(name)}</code></pre>
	</EmptyState>
{:else}
	<AllowancesPlan {snapshot} {name} />
{/if}
