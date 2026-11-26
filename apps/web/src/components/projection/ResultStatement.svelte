<script lang="ts">
import type { Snippet } from "svelte"
import { type ProjectionShape, statementOf } from "../../lib/view/projection/statement"
import Badge from "../ui/Badge.svelte"
import Provenance from "../ui/Provenance.svelte"
import Fact from "./Fact.svelte"
import HashText from "./HashText.svelte"
import NoteList from "./NoteList.svelte"
import OverrideList from "./OverrideList.svelte"

interface Props {
	/** The result this statement belongs to, which names its disclosure for a screen reader. */
	name: string
	/** The echo fields a result states at its root: the As-of, engine, Scenario, Overrides and notes. */
	shape: ProjectionShape
	/** The argv of the Read the result came from. */
	argv: readonly string[]
	/** Extra raw provenance a page states, such as an FI definition or the figures behind a ratio. */
	children?: Snippet
}

/** What a result says about itself: its tax status, its echo, its Overrides and notes, and its Details. */
let { name, shape, argv, children }: Props = $props()
const statement = $derived(statementOf(shape))
const headingId = $props.id()
</script>

<section aria-labelledby={headingId} class="space-y-4 rounded-lg border border-border p-4 sm:p-5">
	<h2 id={headingId} class="text-base font-semibold">What this result says about itself</h2>
	<div>
		<Badge>{statement.tax}</Badge>
	</div>
	<dl class="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
		<Fact label="As of">{statement.asOf}</Fact>
		<Fact label="Horizon">{statement.horizon}</Fact>
		<Fact label="Engine">{statement.engine}</Fact>
		<Fact label="Plan">{statement.scenario}</Fact>
	</dl>
	<OverrideList overrides={statement.overrides} />
	<NoteList notes={statement.notes} scenario={statement.scenario} />
	<Provenance {name} commands={[argv]}>
		{#snippet details()}
			<dl class="mt-3 grid gap-x-6 gap-y-3 sm:grid-cols-2">
				{#each statement.hashes as hash (hash.label)}
					<Fact label={hash.label}><HashText {hash} /></Fact>
				{/each}
				{@render children?.()}
			</dl>
		{/snippet}
	</Provenance>
</section>
