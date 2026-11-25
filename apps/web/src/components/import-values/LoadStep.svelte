<script lang="ts">
import { importSession as session } from "../../client/import-values.svelte.js"
import type { Target } from "../../lib/view/import-values/match"
import { LAYOUT_OPTIONS, layoutHint } from "../../lib/view/import-values/steps"
import type { ParsedImport } from "../../lib/view/import-values/types"
import {
	CSV_NOTE,
	OWED_NOTE,
	problemItems,
	problemsLine,
	tableLine,
} from "../../lib/view/import-values/words"
import SegmentedControl from "../ui/SegmentedControl.svelte"
import ProblemList from "./ProblemList.svelte"
import { BUTTON, PRIMARY } from "./styles"

interface Props {
	parsed: ParsedImport
	targets: readonly Target[]
}

let { parsed, targets }: Props = $props()
const problems = $derived(problemItems(parsed.problems))
const ready = $derived(parsed.problems.length === 0 && parsed.sources.length > 0)
</script>

<!-- Step 1: paste a table or choose a file, and say which way round it is. The text stays here until Import; nothing is sent. -->
<form
	aria-label="Load a balance history"
	class="min-w-0 space-y-5"
	onsubmit={(event) => {
		event.preventDefault()
		if (ready) session.toMatch(parsed.sources, targets)
	}}
>
	<SegmentedControl name="import-layout" label="Layout of the table" options={LAYOUT_OPTIONS} value={session.layout} onChange={(layout) => { session.layout = layout }} />
	<p class="text-sm text-muted-foreground">{layoutHint(session.layout)} A header row is required, and dates are written YYYY-MM-DD. {OWED_NOTE}</p>
	<div class="space-y-1.5">
		<label for="import-text" class="block text-sm font-medium text-foreground">Paste from a spreadsheet</label>
		<textarea
			id="import-text"
			bind:value={session.text}
			rows="8"
			spellcheck="false"
			autocomplete="off"
			class="block w-full min-w-0 rounded-md border border-border bg-card px-3 py-2 font-mono text-xs text-foreground outline-none focus-visible:outline-2 focus-visible:outline-ring"
		></textarea>
	</div>
	<p class="text-xs text-muted-foreground">{CSV_NOTE}</p>
	<div class="flex min-w-0 flex-wrap items-center gap-3">
		<label class="{BUTTON} cursor-pointer focus-within:outline-2 focus-within:outline-ring">
			Choose a CSV or TSV file
			<input type="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain" class="sr-only" onchange={(event) => void session.load(event.currentTarget)} />
		</label>
		{#if session.fileName}<span class="min-w-0 truncate text-sm text-muted-foreground">{session.fileName}</span>{/if}
	</div>
	{#if session.fileProblem}<p role="alert" class="text-sm text-destructive">{session.fileProblem}</p>{/if}
	<ProblemList title={problemsLine(parsed.problems)} items={problems.shown} more={problems.more} />
	{#each parsed.notes as note (note)}<p role="status" class="text-sm text-muted-foreground">{note}</p>{/each}
	{#if ready}
		<p role="status" class="text-sm text-muted-foreground">{tableLine(parsed.entries.length, parsed.sources.length)}</p>
	{/if}
	<div class="flex flex-wrap gap-2">
		<button type="submit" disabled={!ready} class={PRIMARY}>Next</button>
		<button type="button" onclick={() => session.cancel()} class={BUTTON}>Cancel</button>
	</div>
</form>
