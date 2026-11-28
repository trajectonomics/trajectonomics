/** Waits for a real delay; commands inject this so tests never wait. */
export function realSleep(milliseconds: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, milliseconds))
}
