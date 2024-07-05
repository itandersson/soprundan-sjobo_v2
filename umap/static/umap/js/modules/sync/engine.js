import { WebSocketTransport } from './websocket.js'
import { MapUpdater, DataLayerUpdater, FeatureUpdater } from './updaters.js'
import HybridLogicalClock from './hlc.js'

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

  // This method is called by the transport layer on new messages
  receive({ kind, ...payload }) {
    if (kind == 'operation') {
      let updater = this._getUpdater(payload.subject, payload.metadata)
      updater.applyMessage(payload)
    } else if (kind == 'join-response') {
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
          message: { verb: 'request-operations' },
        })
      }
    } else if (kind == 'peerinfo') {
      console.log('received peerinfo', payload)
      this.peers = payload.peers
    } else if (kind == 'peermessage') {
      if (payload.message.verb == 'request-operations') {
        this.transport.send('peermessage', {
          sender: this.uuid,
          recipient: payload.sender,
          message: {
            verb: 'response-operations',
            operations: this._operations.getOperationsSince(),
          },
        })
      } else if (payload.message.verb == 'response-operations') {
        console.log(
          `received operations from peer ${payload.sender}`,
          payload.message.operations
        )
        // Blindly apply the messages for now
        for (let operation of payload.message.operations) {
          let updater = this._getUpdater(operation.subject, operation.metadata)
          updater.applyMessage(operation)
        }
      }
    } else {
      throw new Error(`Received unknown message from the websocket server: ${kind}`)
    }
  }

  _send(inputMessage) {
    let message = this._operations.add(inputMessage)

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
  add(inputMessage) {
    let message = { ...inputMessage, hlc: this._hlc.tick() }
    this._operations.push(message)
    return message
  }

  receiveRemoteOperations(operations) {
    // get the highest date from the passed operations
    let greatestHLC = operations
      .map((op) => op.hlc)
      .reduce((max, current) => (current > max ? current : max))

    // Bump the current HLC to the greatest known one.
    this._hlc.receive(greatestHLC)
    this._operations.push(...operations)

    // TODO: compact the changes here?
    // e.g. we might want to :
    // - group cases of multiple updates
    // - not apply changes where we have a more recent version (but store them nevertheless)
  }

  /**
   * Get operations that happened since a specific clock tick.
   */
  getOperationsSince(hlc) {
    return this._operations //.filter((op) => op.hlc > hlc)
  }
}
