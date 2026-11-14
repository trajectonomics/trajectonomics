/** The zlib level the page budget fixes; gzip output is a pure function of the bytes at one level. */
const GZIP_LEVEL = 6

/** The gzip size in bytes of one text at the budget's zlib level. */
export function gzipSize(text: string): number {
	return Bun.gzipSync(text, { level: GZIP_LEVEL }).byteLength
}
