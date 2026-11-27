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

<!-- The parameters these figures were planned from, and the versions that wrote them. -->
<ReportSection
	id="this-snapshot"
	title="This plan's figures"
	intro="The As-of, horizon and choices these figures were planned from, and the versions that wrote them."
>
	<FactList {facts} />
</ReportSection>
