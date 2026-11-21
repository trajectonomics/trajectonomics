import { useEffect, useState } from "react"
import { COPIED_LABEL, COPY_PROMPT_LABEL } from "../../lib/agent-start"

/** How long a copy control says it copied before it reads as a copy control again. */
const COPIED_FOR_MS = 2000

/** Copy `text` to the clipboard, and say whether it was copied. */
export function useCopy(text: string): readonly [boolean, () => void] {
	const [copied, setCopied] = useState(false)
	useEffect(() => {
		if (!copied) return
		const timer = setTimeout(() => setCopied(false), COPIED_FOR_MS)
		return () => clearTimeout(timer)
	}, [copied])
	const copy = () => {
		void navigator.clipboard.writeText(text).then(
			() => setCopied(true),
			() => setCopied(false),
		)
	}
	return [copied, copy]
}

/** The copy and check glyphs, drawn in the text colour, decoration only. */
export function CopyGlyph({ copied }: { readonly copied: boolean }) {
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
			{copied ? (
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

/** The announcement a copy makes to a screen reader, without moving focus. */
export function CopiedStatus({
	copied,
	what,
}: {
	readonly copied: boolean
	readonly what: string
}) {
	return (
		<span role="status" className="sr-only">
			{copied ? `${what} copied to the clipboard` : ""}
		</span>
	)
}

/** The prompt's copy control: the page's one primary button. */
export function CopyPromptButton({ prompt }: { readonly prompt: string }) {
	const [copied, copy] = useCopy(prompt)
	return (
		<>
			<button
				type="button"
				onClick={copy}
				data-copy-prompt=""
				className="inline-flex items-center gap-2 rounded-md bg-fd-primary px-3 py-2 text-sm font-medium text-fd-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fd-ring"
			>
				<CopyGlyph copied={copied} />
				{copied ? COPIED_LABEL : COPY_PROMPT_LABEL}
			</button>
			<CopiedStatus copied={copied} what="The prompt" />
		</>
	)
}
