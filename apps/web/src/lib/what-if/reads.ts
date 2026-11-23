/**
 * The order a What-if session's reads run in. The server runs one read or Edit at a time and answers a second
 * with 409, so the page never has two reads in flight: a change made while a read runs waits, and when the
 * read returns, the latest state is read once. A reply for a state that is no longer the latest is dropped,
 * and so is the reply of a read that began before the session ended. Pure: the transport is a function
 * the caller passes, so a test drives it with a fake.
 */
export type ReadTransport<State, Reply> = (
	state: State,
	/** Whether this state is still the latest: false once a newer one is asked for or the session ended. */
	isCurrent: () => boolean,
) => Promise<Reply>

export type SerialReaderOptions<State, Reply> = {
	/** Asks the server for the reads of one state of the session. */
	transport: ReadTransport<State, Reply>
	/** Called with the reply of the latest state only. */
	deliver: (reply: Reply, state: State) => void
	/** Called with true when a read starts and false when none runs and none waits. */
	onBusy: (busy: boolean) => void
}

/** Runs the reads of a session one at a time, newest state last, and drops what is out of date. */
export class SerialReader<State, Reply> {
	private latest = 0
	private waiting: { state: State; seq: number } | null = null
	private running = false

	constructor(private readonly options: SerialReaderOptions<State, Reply>) {}

	/** Whether a read runs or waits. */
	get busy(): boolean {
		return this.running || this.waiting !== null
	}

	/** Asks for the reads of this state. It replaces any state still waiting: only the newest is read. */
	request(state: State): void {
		this.waiting = { state, seq: ++this.latest }
		void this.pump()
	}

	/** Marks the state of a read in flight as out of date, before the newer state is ready to ask for. */
	supersede(): void {
		this.latest++
	}

	/** Forgets what waits and drops the reply of a read in flight. The read itself still runs to its end. */
	cancel(): void {
		this.latest++
		this.waiting = null
		if (!this.running) this.options.onBusy(false)
	}

	private async pump(): Promise<void> {
		if (this.running || this.waiting === null) return
		const { state, seq } = this.waiting
		this.waiting = null
		this.running = true
		this.options.onBusy(true)
		let reply: Reply | undefined
		try {
			reply = await this.options.transport(state, () => seq === this.latest)
		} catch {
			reply = undefined
		}
		this.running = false
		if (reply !== undefined && seq === this.latest) this.options.deliver(reply, state)
		if (this.waiting !== null) await this.pump()
		else this.options.onBusy(false)
	}
}
