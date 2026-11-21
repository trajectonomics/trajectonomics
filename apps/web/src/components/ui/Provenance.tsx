import { formatArgv } from "../../lib/format"

export interface ProvenanceProps {
	/** The argv of the Read a figure came from. Shown as the command a person could paste. */
	readonly argv: readonly string[]
}

/** A disclosure that shows the command a figure came from. */
export function Provenance({ argv }: ProvenanceProps) {
	return (
		<details className="text-sm">
			<summary className="cursor-pointer text-muted-foreground hover:text-foreground">
				Show the command
			</summary>
			<pre className="mt-2 overflow-x-auto rounded-md bg-muted p-3 font-mono text-xs text-foreground">
				<code>{formatArgv(argv)}</code>
			</pre>
		</details>
	)
}
