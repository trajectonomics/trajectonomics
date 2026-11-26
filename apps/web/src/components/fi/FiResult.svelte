<script lang="ts">
import { currentItemNames } from "../../client/item-names.svelte.js"
import type { Fi } from "../../lib/contract"
import { fiModelOf } from "../../lib/view/fi/model"
import Fact from "../projection/Fact.svelte"
import ResultStatement from "../projection/ResultStatement.svelte"
import SiteLink from "../ui/SiteLink.svelte"
import FiReachable from "./FiReachable.svelte"
import FiUnreachable from "./FiUnreachable.svelte"

interface Props {
	fi: Fi
	/** The argv of the Read the answer came from, for its command. */
	argv: readonly string[]
}

/** One plan's FI answer: the date or what binds it, its definition, its statement and its tax pointer. */
let { fi, argv }: Props = $props()
const model = $derived(fiModelOf(fi, currentItemNames().people))
</script>

<div class="space-y-8">
	{#if model.kind === "reachable"}
		<FiReachable {model} currency={fi.currency} />
	{:else}
		<FiUnreachable {model} currency={fi.currency} />
	{/if}
	<ResultStatement shape={fi} {argv}>
		{#snippet children()}
			<Fact label="Method">{fi.definition.method}</Fact>
			<Fact label="Definition version">{fi.definition.definitionVersion}</Fact>
		{/snippet}
	</ResultStatement>
	{#if fi.taxYears.length > 0}
		<p class="text-sm text-muted-foreground">
			This plan has tax years. <SiteLink
				href="/tax/"
				class="text-accent underline-offset-4 hover:underline">See them on the Tax page</SiteLink
			>.
		</p>
	{/if}
</div>
