/**
 * The marketing consent table, declared for Better Auth's schema generator. One row per answer;
 * `userId` cascades so deleting the account deletes its consent history.
 */
export function marketingConsentSchema() {
	return {
		marketingConsent: {
			fields: {
				userId: {
					type: "string" as const,
					required: true,
					index: true,
					references: { model: "user", field: "id", onDelete: "cascade" as const },
				},
				optedIn: { type: "boolean" as const, required: true },
				wordingVersion: { type: "string" as const, required: true },
				source: { type: "string" as const, required: true },
				givenAt: { type: "date" as const, required: true },
				withdrawnAt: { type: "date" as const, required: false },
			},
		},
	}
}
