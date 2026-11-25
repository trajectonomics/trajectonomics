<script lang="ts">
import type { Snapshot } from "../../lib/contract"
import { chooseScenario } from "../../lib/view/plan"
import EmptyState from "../ui/EmptyState.svelte"
import EstatePlan from "./EstatePlan.svelte"

interface Props {
	snapshot: Snapshot
	/** The plan the address bar asks for. */
	scenario: string
	terms: string
	onTerms: (value: string) => void
	at: string
	onAt: (value: string) => void
}

let { snapshot, scenario, terms, onTerms, at, onAt }: Props = $props()
const name = $derived(chooseScenario(snapshot.params.scenarios, scenario))
</script>

{#if name === null}
	<EmptyState title="No plan to read" />
{:else}
	<EstatePlan {snapshot} {name} {terms} {onTerms} {at} {onAt} />
{/if}
