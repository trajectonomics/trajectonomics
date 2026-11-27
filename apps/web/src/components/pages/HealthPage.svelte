<script lang="ts">
import LedgerHealthSection from "../health/LedgerHealthSection.svelte"
import ReadsSection from "../health/ReadsSection.svelte"
import SnapshotSection from "../health/SnapshotSection.svelte"
import PageShell from "../ui/PageShell.svelte"
</script>

<!-- Health: the doctor's checks and row counts, this Snapshot's parameters, and every Read it holds. -->
<PageShell
	title="Health"
>
	{#snippet children(snapshot)}
		<div class="space-y-12">
			<LedgerHealthSection doctor={snapshot.reads.doctor} />
			<SnapshotSection {snapshot} />
			<ReadsSection {snapshot} />
		</div>
	{/snippet}
</PageShell>
