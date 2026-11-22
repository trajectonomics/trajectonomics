<script lang="ts">
import type { Snapshot } from "../../lib/contract"
import { snapshotFacts } from "../../lib/view/health/snapshot-facts"
import ReportSection from "../ledger/ReportSection.svelte"
import FactList from "./FactList.svelte"

interface Props {
	snapshot: Snapshot
}

let { snapshot }: Props = $props()
const facts = $derived(snapshotFacts(snapshot))
</script>

<!-- The parameters the Snapshot was planned from, and the versions that wrote it. -->
<ReportSection
	id="this-snapshot"
	title="This Snapshot"
	intro="The As-of, horizon and choices this Snapshot was planned from, and the versions that wrote it."
>
	<FactList {facts} />
</ReportSection>
