<script lang="ts">
import type { Read } from "../../lib/contract"
import type { HealthView } from "../../lib/view/overview/health"
import Badge from "../ui/Badge.svelte"
import Card from "../ui/Card.svelte"
import ReadView from "../ui/ReadView.svelte"

interface Props {
	health: Read<HealthView>
}

let { health }: Props = $props()
</script>

<!-- The ledger's health: the CLI's verdict, how many checks failed, and the row counts. -->
<Card title="Ledger health" href="/health/" argv={health.argv}>
	<ReadView read={health} label="Ledger health">
		{#snippet children(view)}
			<div class="space-y-4">
				<div class="space-y-1">
					<Badge tone={view.ok ? "neutral" : "accent"}>{view.ok ? "OK" : "Needs attention"}</Badge>
					<p class="text-sm">
						{view.failed === 0
							? `All ${view.checks} checks pass.`
							: `${view.failed} of ${view.checks} checks failed.`}
					</p>
				</div>
				<dl class="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
					{#each view.counts as count (count.label)}
						<div class="flex justify-between gap-2">
							<dt class="text-muted-foreground">{count.label}</dt>
							<dd class="tabular-nums">{count.value}</dd>
						</div>
					{/each}
				</dl>
			</div>
		{/snippet}
	</ReadView>
</Card>
