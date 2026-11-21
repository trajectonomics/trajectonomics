/**
 * Replaces every occurrence of a directory in serialised text with a stated stand-in, so a Snapshot
 * made from a scratch ledger names `~/.traj` and not the scratch path. Pure string work.
 */
export function redactDirectory(text: string, directory: string, standIn: string): string {
	return directory === "" ? text : text.split(directory).join(standIn)
}
