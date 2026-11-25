import { z } from "zod"
import type { IngestError, IngestValidation } from "./errors"
import { toIngestError } from "./issue"
import { MAX_INGEST_ERRORS, MAX_INGEST_ROWS } from "./rules"
import { quotaSchema, toQuotaSample } from "./schema-quota"
import { toUsageRow, usageSchema } from "./schema-usage"
import type { Principal } from "./types"

const envelope = z.strictObject({
	usage: z.array(z.unknown()).default([]),
	quota: z.array(z.unknown()).default([]),
})

function fail(errors: readonly IngestError[]): IngestValidation {
	return { ok: false, errors: errors.slice(0, MAX_INGEST_ERRORS) }
}

/** Validates a whole ingest body; the batch is rejected if any row fails a rule. */
export function validateIngest(
	input: unknown,
	principal: Principal,
	nowMs: number,
): IngestValidation {
	const parsed = envelope.safeParse(input)
	if (!parsed.success) {
		const errors = parsed.error.issues.map((issue) => ({
			...toIngestError(issue, ""),
			code: "BODY_INVALID" as const,
		}))
		return fail(errors)
	}
	const rawUsage = parsed.data.usage
	const rawQuota = parsed.data.quota
	const total = rawUsage.length + rawQuota.length
	if (total > MAX_INGEST_ROWS) {
		return fail([
			{ path: "", code: "TOO_MANY_ROWS", message: `At most ${MAX_INGEST_ROWS} rows are allowed.` },
		])
	}
	if (total === 0) {
		return fail([{ path: "", code: "EMPTY_BATCH", message: "The batch carries no rows." }])
	}
	const usage = validateRows(
		rawUsage,
		usageSchema(principal, nowMs),
		principal,
		"usage",
		toUsageRow,
	)
	const quota = validateRows(
		rawQuota,
		quotaSchema(principal, nowMs),
		principal,
		"quota",
		toQuotaSample,
	)
	if (usage.errors.length > 0 || quota.errors.length > 0) {
		return fail([...usage.errors, ...quota.errors])
	}
	return {
		ok: true,
		batch: {
			contributorId: principal.contributorId,
			series: principal.series,
			usage: usage.rows,
			quota: quota.rows,
		},
	}
}

type RowResult<T> = {
	rows: T[]
	errors: IngestError[]
}

function validateRows<Shape, Row>(
	raw: readonly unknown[],
	schema: z.ZodType<Shape>,
	principal: Principal,
	label: string,
	convert: (row: Shape, contributor: Principal["contributorId"]) => Row,
): RowResult<Row> {
	const rows: Row[] = []
	const errors: IngestError[] = []
	raw.forEach((value, index) => {
		const parsed = schema.safeParse(value)
		if (!parsed.success) {
			errors.push(...parsed.error.issues.map((issue) => toIngestError(issue, `${label}[${index}]`)))
			return
		}
		rows.push(convert(parsed.data, principal.contributorId))
	})
	return { rows, errors }
}
