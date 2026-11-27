/**
 * The pending account deletion queue. A row says "the data Worker has not yet been told that this
 * anonymous auth user id is gone". It has no foreign key on purpose: the user row is already
 * deleted when the row is written, and the row must outlive it until the data side acknowledges.
 *
 * The schema is a Better Auth plugin table only so `bun run schema` generates its migration like
 * every other table. There are no endpoints.
 */
export function pendingDeletion() {
	return {
		id: "pending-deletion",
		schema: {
			pendingDeletion: {
				fields: {
					authUserId: { type: "string" as const, required: true, index: true },
					requestedAt: { type: "date" as const, required: true, index: true },
					acknowledgedAt: { type: "date" as const, required: false, index: true },
					attempts: { type: "number" as const, required: true },
					lastError: { type: "string" as const, required: false },
				},
			},
		},
	}
}
