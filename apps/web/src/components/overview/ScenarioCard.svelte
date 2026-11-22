<script lang="ts" generics="T">
import type { Snippet } from "svelte"
import type { ScenarioView } from "../../lib/view/overview/scenario"
import Card from "../ui/Card.svelte"
import ReadView from "../ui/ReadView.svelte"

interface Props {
	title: string
	/** The page this card summarises. */
	href: string
	/** The name of the Read this card shows, such as "FI". Named in its error. */
	label: string
	scenario: ScenarioView<T>
	/** Renders the data of the Scenario's Read. */
	body: Snippet<[T]>
}

let { title, href, label, scenario, body }: Props = $props()
</script>

<!-- A card for one Scenario's Read: it names the Scenario, and says what is missing when there is none. -->
{#if scenario.status === "none"}
	<Card {title} {href}>
		<p class="text-sm text-muted-foreground">The Snapshot names no Scenario.</p>
	</Card>
{:else if scenario.status === "unread"}
	<Card {title} {href}>
		<p class="text-sm text-muted-foreground">
			The Snapshot holds no {label} read for Scenario {scenario.name}.
		</p>
	</Card>
{:else}
	<Card {title} {href} argv={scenario.read.argv}>
		<p class="mb-3 text-sm text-muted-foreground">Scenario {scenario.name}</p>
		<ReadView read={scenario.read} {label}>
			{#snippet children(data)}
				{@render body(data)}
			{/snippet}
		</ReadView>
	</Card>
{/if}
