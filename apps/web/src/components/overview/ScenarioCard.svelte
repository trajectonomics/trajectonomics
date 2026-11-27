<script lang="ts" generics="T">
import type { Snippet } from "svelte"
import type { ScenarioView } from "../../lib/view/overview/scenario"
import Card from "../ui/Card.svelte"
import ReadView from "../ui/ReadView.svelte"

interface Props {
	title: string
	/** The page this card summarises. A card whose read is missing or failed does not link. */
	href: string
	/** The name of the Read this card shows, such as "FI". Named in its error. */
	label: string
	scenario: ScenarioView<T>
	/** Renders the data of the Scenario's Read. */
	body: Snippet<[T]>
	/** Extra provenance for the card's Details, such as the tax rules its figures came from. */
	details?: Snippet<[ScenarioView<T>]> | undefined
	/** Classes for the card itself, such as the grid span of a wide card. */
	className?: string | undefined
}

let { title, href, label, scenario, body, details, className }: Props = $props()
/** The words a card says when the Snapshot holds no read for its plan, or no plan at all. */
const missing = $derived(
	scenario.status === "none"
		? "No plan is named in these figures."
		: scenario.status === "unread"
			? `These figures hold no ${label} read for plan ${scenario.name}.`
			: null,
)
</script>

<!-- A card for one plan's Read: it links to its page while the Read answers, and says what is missing otherwise. -->
{#if scenario.status !== "ready"}
	<Card quiet {title} {className}>
		<p class="text-sm text-muted-foreground">{missing}</p>
	</Card>
{:else}
	{#snippet cardDetails()}{@render details?.(scenario)}{/snippet}
	<Card
		quiet
		{title}
		{className}
		href={scenario.read.ok ? href : undefined}
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
