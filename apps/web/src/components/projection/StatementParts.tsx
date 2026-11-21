import { useHideAmounts } from "../../client/preferences-store"
import { maskMoney } from "../../lib/format"
import type { HashView, OverrideView } from "../../lib/view/projection/statement"

export interface HashTextProps {
	readonly hash: HashView
}

/** A content hash in twelve characters, with the full hash one disclosure away. */
export function HashText({ hash }: HashTextProps) {
	return (
		<span className="block">
			<code className="font-mono">{hash.short}</code>
			<details className="mt-1 text-xs">
				<summary className="cursor-pointer text-muted-foreground hover:text-foreground">
					Full hash
				</summary>
				<code className="mt-1 block break-all font-mono">{hash.full}</code>
			</details>
		</span>
	)
}

export interface OverrideListProps {
	readonly overrides: readonly OverrideView[]
	/** Overrides the hide-amounts switch. Left out, the switch decides. */
	readonly hidden?: boolean | undefined
}

/** The Overrides applied, each with its path and its value, or a line saying there were none. */
export function OverrideList({ overrides, hidden: hiddenOverride }: OverrideListProps) {
	const [switchHidden] = useHideAmounts()
	const hidden = hiddenOverride ?? switchHidden
	if (overrides.length === 0) {
		return <p className="text-sm">No Overrides</p>
	}
	return (
		<div className="space-y-2 text-sm">
			<p className="font-medium">Overrides applied</p>
			<ul className="space-y-1">
				{overrides.map((override) => (
					<li key={override.path} className="flex flex-wrap gap-x-3 break-all">
						<code className="font-mono">{override.path}</code>
						<span className="font-mono tabular-nums">
							{hidden && override.sensitive ? maskMoney(override.display) : override.display}
						</span>
					</li>
				))}
			</ul>
		</div>
	)
}

export interface NoteListProps {
	readonly notes: readonly string[]
}

/** Every note the CLI states on the result, in its order. */
export function NoteList({ notes }: NoteListProps) {
	if (notes.length === 0) return <p className="text-sm text-muted-foreground">No notes</p>
	return (
		<div className="space-y-2 text-sm">
			<p className="font-medium">Notes</p>
			<ul className="list-disc space-y-1 pl-5">
				{notes.map((note) => (
					<li key={note}>{note}</li>
				))}
			</ul>
		</div>
	)
}
