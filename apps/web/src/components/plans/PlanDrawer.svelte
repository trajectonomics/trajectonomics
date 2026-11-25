<script lang="ts">
import { currentSearch } from "../../client/location.svelte.js"
import { planEditor } from "../../client/plan-editor.svelte.js"
import { paramOf } from "../../client/query-string"
import { currentSnapshot } from "../../client/snapshot.svelte.js"
import { chooseScenario } from "../../lib/view/plan"
import { planRows } from "../../lib/view/plans/rows"
import Drawer from "../ui/Drawer.svelte"
import StaleNotice from "../ui/StaleNotice.svelte"
import DeletePlanForm from "./DeletePlanForm.svelte"
import NewPlanForm from "./NewPlanForm.svelte"
import NotesForm from "./NotesForm.svelte"
import RenamePlanForm from "./RenamePlanForm.svelte"

const TITLES = {
	rename: "Rename plan",
	notes: "Notes",
	copy: "Copy plan",
	delete: "Delete plan",
	new: "New plan",
} as const

const current = $derived(currentSnapshot())
const snapshot = $derived(current.status === "ready" ? current.snapshot : null)
const rows = $derived(snapshot === null ? [] : planRows(snapshot))
const row = $derived(rows.find((one) => one.name === planEditor.plan))
const names = $derived(snapshot?.params.scenarios ?? [])
const stored = $derived(rows.map((one) => one.name))
const mode = $derived(planEditor.mode)
const shown = $derived(
	chooseScenario(names, paramOf(currentSearch(), "scenario", "")) === planEditor.plan,
)
const notes = $derived(snapshot?.reads.documents[planEditor.plan])
const close = () => planEditor.close()
</script>

<!-- The plan drawer: the form of one plan action, opened from the plan switcher or the plans page. -->
<Drawer open={mode !== null && snapshot !== null} title={mode === null ? "" : TITLES[mode]} onClose={close}>
	<StaleNotice />
	{#if snapshot !== null}
		{#if mode === "rename" && row}
			<RenamePlanForm {row} {stored} {shown} onDone={close} />
		{:else if mode === "notes" && row}
			<NotesForm name={row.name} notes={notes?.ok ? (notes.data.scenario.notes ?? null) : null} onDone={close} />
		{:else if mode === "delete" && row}
			<DeletePlanForm {row} {names} {shown} onDone={close} />
		{:else if mode === "new" || mode === "copy"}
			<NewPlanForm {stored} {names} asOf={snapshot.params.asOf} copyOf={mode === "copy" ? planEditor.plan : ""} onDone={close} />
		{/if}
	{/if}
</Drawer>
