/**
 * A plan name as a shell reads it back, for a hint a person can paste (cli ADR-0048). It lives apart
 * from the command builder so an Assumed value's hint quotes a name the same way (cli ADR-0083).
 */

/** A name as a shell reads it back: bare when it is only `A-Za-z0-9._-`, else in single quotes. */
export function quotedName(name: string): string {
	return /^[A-Za-z0-9._-]+$/.test(name) ? name : `'${name.replaceAll("'", "'\\''")}'`
}
