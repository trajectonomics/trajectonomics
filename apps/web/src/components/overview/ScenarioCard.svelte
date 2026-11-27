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
	/** Extra provenance for the card's Details, such as the tax rules its figures came from. */
	details?: Snippet<[ScenarioView<T>]> | undefined
}

let { title, href, label, scenario, body, details }: Props = $props()
</script>

<!-- A card for one plan's Read: it links to its page, and says what is missing when there is none. -->
{#if scenario.status === "none"}
	<Card {title} {href}>
		<p class="text-sm text-muted-foreground">No plan is named in these figures.</p>
	</Card>
{:else if scenario.status === "unread"}
	<Card {title} {href}>
		<p class="text-sm text-muted-foreground">
			These figures hold no {label} read for plan {scenario.name}.
		</p>
	</Card>
{:else}
	{#snippet cardDetails()}{@render details?.(scenario)}{/snippet}
	<Card
		{title}
		{href}
		argv={scenario.read.argv}
		details={details === undefined ? undefined : cardDetails}
	>
		<ReadView read={scenario.read} {label}>
			{#snippet children(data)}
				{@render body(data)}
			{/snippet}
		</ReadView>
	</Card>
{/if}
