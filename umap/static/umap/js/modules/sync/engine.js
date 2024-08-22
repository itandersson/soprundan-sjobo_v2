import { WebSocketTransport } from './websocket.js'
import { MapUpdater, DataLayerUpdater, FeatureUpdater } from './updaters.js'
import HybridLogicalClock from './hlc.js'
import * as Utils from '../utils.js'

/**
 * The syncEngine exposes an API to sync messages between peers over the network.
 *
 * It's taking care of initializing the `transport` layer (sending and receiving
 * messages over websocket), the `operations` list (to store them locally),
 * and the `updaters` to apply messages to the map.
 *
 * You can use the `update`, `upsert` and `delete` methods.
 *
 * A `proxy()` method is exposed, to inject `subject` and `metadata` fields.
 *
 * @example
 *
 * ```
 * const sync = new SyncEngine(map)
 *
 * // Get the authentication token from the umap server
 * sync.authenticate(tokenURI, webSocketURI, server)
 *
 * // Alternatively, start the engine manually with
 * sync.start(webSocketURI, authToken)
 *
 * // Then use the `upsert`, `update` and `delete` methods.
 * let {metadata, subject} = object.getSyncMetadata()
 * sync.upsert(subject, metadata, "value")
 * sync.update(subject, metadata, "key", "value")
 * sync.delete(subject, metadata, "key")
 *
 * // Or using the `proxy()` method:
 * let syncProxy = sync.proxy(object)
 * syncProxy.upsert("value")
 * syncProxy.update("key", "value")
 * ```
 */
export class SyncEngine {
  constructor(map) {
    this.updaters = {
      map: new MapUpdater(map),
      feature: new FeatureUpdater(map),
      datalayer: new DataLayerUpdater(map),
    }
    this.transport = undefined
    this._operations = new Operations()
    this._lastKnownHLC = null
  }

  async authenticate(tokenURI, webSocketURI, server) {
    const [response, _, error] = await server.get(tokenURI)
    if (!error) {
      this.start(webSocketURI, response.token)
    }
  }

  start(webSocketURI, authToken) {
    this.transport = new WebSocketTransport(webSocketURI, authToken, this)
  }

  stop() {
    if (this.transport) this.transport.close()
    this.transport = undefined
  }

  _getUpdater(subject, metadata) {
    if (Object.keys(this.updaters).includes(subject)) {
      return this.updaters[subject]
    }
    throw new Error(`Unknown updater ${subject}, ${metadata}`)
  }

  applyOperation(operation) {
    const updater = this._getUpdater(operation.subject, operation.metadata)
    updater.applyMessage(operation)
  }

  updateLastKnownHLC(remoteHLC) {
    if (!this._lastKnownHLC || remoteHLC > this._lastKnownHLC) {
      this._lastKnownHLC = remoteHLC
    }
  }

  // This method is called by the transport layer on new messages
  receive({ kind, ...payload }) {
    // For debugging
    if (this.offline) return
    if (kind === 'operation') {
      this.updateLastKnownHLC(payload.hlc)
      this._operations.storeRemoteOperations([payload])
      this.applyOperation(payload)
    } else if (kind === 'join-response') {
      debug('received join response', payload)
      this.uuid = payload.uuid
      this.peers = payload.peers

      // Get one peer at random
      let otherPeers = this.peers.filter((p) => p !== this.uuid)
      if (otherPeers.length > 0) {
        const random = Math.floor(Math.random() * otherPeers.length)
        let randomPeer = otherPeers[random]

        // Get missing operations before we joined.
        this.transport.send('peermessage', {
          sender: this.uuid,
          recipient: randomPeer,
          message: {
            verb: 'request-operations',
            lastKnownHLC: this._lastKnownHLC,
          },
        })
      }
    }
    //
    else if (kind === 'list-peers') {
      debug('received peerinfo', payload)
      this.peers = payload.peers
    } else if (kind === 'peermessage') {
      debug('received peermessage', payload)
      if (payload.message.verb === 'request-operations') {
        this.transport.send('peermessage', {
          sender: this.uuid,
          recipient: payload.sender,
          message: {
            verb: 'response-operations',
            operations: this._operations.getOperationsSince(payload.lastKnownHLC),
          },
        })
      } else if (payload.message.verb === 'response-operations') {
        debug(
          `received operations from peer ${payload.sender}`,
          payload.message.operations
        )

        if (payload.message.operations.length === 0) return

        const remoteOperations = Operations.sort(payload.message.operations)
        this._operations.storeRemoteOperations(remoteOperations)
        const lastOperation = remoteOperations[remoteOperations.length - 1]
        this.updateLastKnownHLC(lastOperation.hlc)

        // Sort the local operations only once, see below.
        const sortedLocalOperations = this._operations.sorted()
        for (const remote of remoteOperations) {
          if (!this._operations.isLocalOperationNewer(remote, sortedLocalOperations)) {
            this.applyOperation(remote)
          }
        }

        // TODO: compact the changes here?
        // e.g. we might want to :
        // - group cases of multiple updates
        // - not apply changes where we have a more recent version (but store them nevertheless)

        // 1. Get the list of fields that changed (in the incoming operations)
        // 2. For each field, get the last version
        // 3. Check if we should apply the changes.

        // For each operation
        // Get the updated key hlc
        // If key.local_hlc > key.remote_hlc: drop
        // Else: apply
      }
    } else {
      throw new Error(`Received unknown message from the websocket server: ${kind}`)
    }
  }

  _send(inputMessage) {
    let message = this._operations.addLocal(inputMessage)

    if (this.offline) return
    if (this.transport) {
      this.transport.send('operation', message)
    }
  }

  upsert(subject, metadata, value) {
    this._send({ verb: 'upsert', subject, metadata, value })
  }

  update(subject, metadata, key, value) {
    this._send({ verb: 'update', subject, metadata, key, value })
  }

  delete(subject, metadata, key) {
    this._send({ verb: 'delete', subject, metadata, key })
  }

  /**
   * Create a proxy for this sync engine.
   *
   * The proxy will automatically call `object.getSyncMetadata` and inject the returned
   * `subject` and `metadata`` to the `upsert`, `update` and `delete` calls.
   *
   * The proxy can be used as follows:
   *
   * ```
   * const proxy = sync.proxy(object)
   * proxy.update('key', 'value')
   *```
   */
  proxy(object) {
    const handler = {
      get(target, prop) {
        // Only proxy these methods
        if (['upsert', 'update', 'delete'].includes(prop)) {
          const { subject, metadata } = object.getSyncMetadata()
          // Reflect.get is calling the original method.
          // .bind is adding the parameters automatically
          return Reflect.get(...arguments).bind(target, subject, metadata)
        }
        return Reflect.get(...arguments)
      },
    }
    return new Proxy(this, handler)
  }
}

/**
 * Abstracts away the operations and the integration with the HLC
 *
 * This can be considered as a registry of the operations, able
 * to merge remote operations and keep an ordering.
 */
export class Operations {
  static sort(operations) {
    const copy = [...operations]
    copy.sort((a, b) => (a.hlc > b.hlc ? -1 : 1))
    return copy
  }

  constructor() {
    this._hlc = new HybridLogicalClock()
    this._operations = new Array()
  }

  /**
   * Tick the clock and add store the passed message in the operations list.
   *
   * @param {*} inputMessage
   * @returns {*} clock-aware message
   */
  addLocal(inputMessage) {
    let message = { ...inputMessage, hlc: this._hlc.tick() }
    this._operations.push(message)
    return message
  }

  /**
   * There are multiple views of the operations in this `Operations` class:
   *
   * - the list of operations sorted by their appearance order
   * - the list of operations sorted by the HLC (same sort order on different peers)
   *
   * @returns {Array}
   */
  sorted() {
    return Operations.sort(this._operations)
  }

  /**
   * Check the list of local operations for some newer data than the one
   * passed as an argument.
   *
   * This can be used to find out if a given remote operation should be
   * applied locally, or if newer values already exist.
   *
   * @param {*} remote the remote operation
   * @returns bool
   */
  isLocalOperationNewer(remote, sortedLocalOperations) {
    for (const local of sortedLocalOperations) {
      // local is newer
      if (local.hlc < remote.hlc) {
        // No need to iterate, all operations are older.
        return false
      }

      switch (local.verb) {
        case 'upsert':
          if (
            local.subject === remote.subject &&
            local.metadata === remote.metadata &&
            Utils.isObject(local.value) &&
            remote.key in local.value
          ) {
            return true
          }
          break

        case 'update':
        case 'delete':
          if (
            local.subject === remote.subject &&
            local.metadata === remote.metadata &&
            local.key === remote.key
          ) {
            return true
          }
          break
      }
    }
    return false
  }

  /**
   * Apply a list of remote operations locally
   *
   * - Update the clock to the
   * @param {Array} remoteOperations
   */
  storeRemoteOperations(remoteOperations) {
    // get the highest date from the passed operations
    let greatestHLC = remoteOperations
      .map((op) => op.hlc)
      .reduce((max, current) => (current > max ? current : max))

    // Bump the current HLC.
    this._hlc.receive(greatestHLC)
    this._operations.push(...remoteOperations)
  }

  /**
   * Get operations that happened since a specific clock tick.
   */
  getOperationsSince(hlc) {
    if (!hlc) return this._operations
    // first get the position of the clock that was sent
    const start = this._operations.findIndex((op) => op.hlc === hlc)
    this._operations.slice(start)
    return this._operations.filter((op) => op.hlc > hlc)
  }
}

function debug(...args) {
  console.debug('SYNC ⇆', ...args)
}
