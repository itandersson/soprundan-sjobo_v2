/**
 * This is an implementation of a Hybrid Logical Clock (HLC).
 *
 * HLCs are mechanisms to order operations consistently in
 * distributed systems.
 * 
 * You can interact with like this:
 * 
 */
export default class HybridLogicalClock {

  constructor() {
    this._current = {
      walltime: Date.now(),
      nn: 0,
      id: crypto.randomUUID()
    }
  }

  /**
   * Return a serialized version of the current clock
   */
  serialize(clock = this._current) {
    const { walltime, nn, id } = clock;
    return `${walltime}:${nn}:${id}`
  }

  parse(raw) {
    let [walltime, nn, id] = raw.split(':')
    return { walltime, nn, id }
  }

  /**
   * Increment the counter.
   * 
   * - If the current time is greater than the known one, increment it.
   * - Otherwise, increment the `nn` counter by 1.
   */
  tick() {
    // Copy the current value of the hlc to avoid concurrency issues
    const current = { ...this._current }
    const now = Date.now()

    let nextValue

    if (now > current.walltime) {
      nextValue = { ...current, walltime: now, nn: 0 }
    } else {
      nextValue = { ...current, nn: current.nn + 1 }
    }

    this._current = nextValue
    return this.serialize(this._current)
  }

  /**
   * Receive a remote clock info, and decide what to do with it.
   *
   * - If the current time is greater than both local and remote wall time, update it.
   * - If the current time is the same, increment max (local, remote) `nn` counter by 1.
   * - If remote time is greater, keep the remote time and increment `nn`
   * - Otherwise, keep local values and increment `nn`
   **/
  receive(remoteRaw) {
    const remote = this.parse(remoteRaw)
    const local = copy(this._current)
    const now = Date.now()

    let nextValue

    if (now > local.walltime && now > remote.walltime) {
      nextValue = { ...local, walltime: now }
    }

    else if (local.walltime == remote.walltime) {
      let nn = Math.max(local.nn, remote.nn) + 1
      nextValue = { ...local, nn: nn }
    }

    else if (remote.walltime > local.walltime) {
      nextValue = { ...remote, id: local.id, nn: remote.nn + 1 }
    }
    else {
      nextValue = { ...local, nn: local.nn + 1 }
    }

    this._current = nextValue
    return this._current
  }
}
