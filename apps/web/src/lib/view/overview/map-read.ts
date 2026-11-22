import type { Read } from "../../contract"

/**
 * A Read with its data mapped. A failed Read keeps its argv and its error, so the card shows what
 * the CLI said and nothing is invented in its place.
 */
export function mapRead<T, U>(read: Read<T>, map: (data: T) => U): Read<U> {
	return read.ok ? { argv: read.argv, ok: true, data: map(read.data) } : read
}
