import { useEffect, useState } from "react"
import { COPIED_LABEL, COPY_FAILED_LABEL, COPY_PROMPT_LABEL } from "../../lib/agent-start"

/** How long a copy control shows its outcome before it reads as a copy control again. */
const OUTCOME_FOR_MS = 2000

/** Where a copy control stands: ready, just copied, or refused by the browser. */
export type CopyState = "idle" | "copied" | "failed"

/** Write `text` to the clipboard; a browser without one, or one that refuses, is a failure. */
async function writeClipboard(text: string): Promise<void> {
	if (navigator.clipboard === undefined) throw new Error("no clipboard")
	await navigator.clipboard.writeText(text)
}

/**
 * Copy `text` to the clipboard and say how it went. Every click clears the outcome first and
 * restarts its timer, so a second copy is announced again and shows for its full time.
 */
export function useCopy(text: string): readonly [CopyState, () => void] {
	const [state, setState] = useState<CopyState>("idle")
	const [attempt, setAttempt] = useState(0)
	useEffect(() => {
		if (attempt === 0) return
		const timer = setTimeout(() => setState("idle"), OUTCOME_FOR_MS)
		return () => clearTimeout(timer)
	}, [attempt])
	const copy = () => {
		setState("idle")
		writeClipboard(text)
			.then(
				() => setState("copied"),
				() => setState("failed"),
			)
			.finally(() => setAttempt((count) => count + 1))
	}
	return [state, copy]
}

/** The copy and check glyphs, drawn in the text colour, decoration only. */
export function CopyGlyph({ state }: { readonly state: CopyState }) {
	return (
		<svg
			aria-hidden="true"
			focusable="false"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			className="size-4 shrink-0"
		>
			{state === "copied" ? (
				<path d="M20 6 9 17l-5-5" />
			) : (
				<>
					<rect x="9" y="9" width="13" height="13" rx="2" />
					<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
				</>
			)}
		</svg>
	)
}

/** What a copy says to a screen reader, without moving focus. */
function outcome(state: CopyState, what: string): string {
	if (state === "copied") return `${what} copied to the clipboard`
	if (state === "failed") return `${what} was not copied. Select the text to copy it.`
	return ""
}

/** The announcement a copy makes to a screen reader, without moving focus. */
export function CopiedStatus({
	state,
	what,
}: {
	readonly state: CopyState
	readonly what: string
}) {
	return (
		<span role="status" className="sr-only">
			{outcome(state, what)}
		</span>
	)
}

/** The prompt button's words in each state. */
const PROMPT_LABELS: Readonly<Record<CopyState, string>> = {
	idle: COPY_PROMPT_LABEL,
	copied: COPIED_LABEL,
	failed: COPY_FAILED_LABEL,
}

/** The prompt's copy control: the page's one primary button. */
export function CopyPromptButton({ prompt }: { readonly prompt: string }) {
	const [state, copy] = useCopy(prompt)
	return (
		<>
			<button
				type="button"
				onClick={copy}
				data-copy-prompt=""
				className="inline-flex items-center gap-2 rounded-md bg-fd-accent px-3 py-2 text-sm font-medium text-fd-accent-foreground transition-[opacity,transform] hover:opacity-90 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring"
			>
				<CopyGlyph state={state} />
				{PROMPT_LABELS[state]}
			</button>
			<CopiedStatus state={state} what="The prompt" />
		</>
	)
}
