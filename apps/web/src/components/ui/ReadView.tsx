import type { ReactNode } from "react"
import type { ErrorBody, Read } from "../../lib/contract"
import { formatArgv } from "../../lib/format"

export interface ReadViewProps<T> {
	/** The Read to show. A failed Read renders the CLI's own message, hint and code. */
	readonly read: Read<T>
	/** The name of the figure this Read answers, such as "Net worth". Named in an error. */
	readonly label: string
	/** Renders the data of a successful Read. */
	readonly render: (data: T) => ReactNode
}

/** Renders a Read's data, or the CLI's error for it, so one failed Read does not blank a page. */
export function ReadView<T>({ read, label, render }: ReadViewProps<T>) {
	if (!read.ok) return <ReadError label={label} error={read.error} argv={read.argv} />
	return <>{render(read.data)}</>
}

interface ReadErrorProps {
	readonly label: string
	readonly error: ErrorBody
	readonly argv: readonly string[]
}

function ReadError({ label, error, argv }: ReadErrorProps) {
	return (
		<div role="alert" className="rounded-lg border border-destructive p-4 text-sm">
			<p className="font-medium">{label} could not be read</p>
			<p className="mt-1">{error.message}</p>
			{error.hint && <p className="mt-1 text-muted-foreground">{error.hint}</p>}
			<p className="mt-2 text-xs text-muted-foreground">Error code {error.code}</p>
			<pre className="mt-2 overflow-x-auto rounded-md bg-muted p-2 font-mono text-xs">
				<code>{formatArgv(argv)}</code>
			</pre>
		</div>
	)
}
