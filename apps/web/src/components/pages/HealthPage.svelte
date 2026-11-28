<script lang="ts">
import HealthFocus from "../health/HealthFocus.svelte"
import LedgerHealthSection from "../health/LedgerHealthSection.svelte"
import ReadsSection from "../health/ReadsSection.svelte"
import SnapshotSection from "../health/SnapshotSection.svelte"
import PageShell from "../ui/PageShell.svelte"
</script>

<!-- Health: the focus ring of checks, then the doctor's checks and row counts, this Snapshot's parameters, and every Read it holds. -->
<PageShell
	title="Health"
>
	{#snippet children(snapshot)}
		<div class="space-y-12">
			<HealthFocus doctor={snapshot.reads.doctor} {snapshot} />
			<LedgerHealthSection doctor={snapshot.reads.doctor} />
			<SnapshotSection {snapshot} />
			<ReadsSection {snapshot} />
		</div>
	{/snippet}
</PageShell>
