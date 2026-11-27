<script lang="ts">
import { currentItemNames } from "../../client/item-names.svelte.js"
import type { Fi } from "../../lib/contract"
import { fiModelOf } from "../../lib/view/fi/model"
import Fact from "../projection/Fact.svelte"
import ResultStatement from "../projection/ResultStatement.svelte"
import Money from "../ui/Money.svelte"
import PlanLink from "../ui/PlanLink.svelte"
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
const reference = $derived(model.kind === "reachable" ? model.reference : null)
</script>

<div class="space-y-8">
	{#if model.kind === "reachable"}
		<FiReachable {model} currency={fi.currency} />
	{:else}
		<FiUnreachable {model} currency={fi.currency} />
	{/if}
	<ResultStatement name={`FI of ${fi.scenario.name}`} shape={fi} {argv}>
		{#snippet children()}
			<Fact label="Method">{fi.definition.method}</Fact>
			<Fact label="Definition version">{fi.definition.definitionVersion}</Fact>
			{#if reference !== null}
				<Fact label="Numerator"><Money amount={reference.numerator} currency={fi.currency} /></Fact>
				{#if reference.multipleRaw !== null}
					<Fact label="Multiple">{reference.multipleRaw}</Fact>
				{/if}
			{/if}
		{/snippet}
	</ResultStatement>
	{#if fi.taxYears.length > 0}
		<!-- A reachable answer's tax rows stop work at the FI date; the Tax page keeps the plan as written. -->
		<p class="text-sm text-muted-foreground">
			The <PlanLink
				href={`/tax/?scenario=${encodeURIComponent(fi.scenario.name)}`}
				plan={fi.scenario.name}
				class="text-accent underline underline-offset-4">Tax page</PlanLink
			> shows the plan as written{model.kind === "reachable" ? ", without stopping work at the FI date" : ""}.
		</p>
	{/if}
</div>
