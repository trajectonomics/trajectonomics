// The ages an Edit's Snapshot answer carries on each annual row (cli ADR-0048), for the write tests.
/** The ages a Scenario's annual rows carry in a Snapshot answer: each row's person and age, in order. */
export function agesOf(answer: { snapshot?: unknown }, name: string): string[] {
	const reads = (
		answer.snapshot as {
			reads: {
				projections: Record<
					string,
					{
						ok: boolean
						data: {
							tables: { name: string; rows: { ages: { person: string; age: number }[] }[] }[]
						}
					}
				>
			}
		}
	).reads
	const read = reads.projections[name]
	if (read === undefined || !read.ok) throw new Error(`no projection read for ${name}`)
	const annual = read.data.tables.find((table) => table.name === "annual")
	return (annual?.rows ?? []).map((row) =>
		row.ages.map((age) => `${age.person} ${age.age}`).join(","),
	)
}
