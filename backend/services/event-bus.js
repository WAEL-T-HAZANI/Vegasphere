/**
 * In-process domain event bus.
 *
 * Decouples persistence (controllers) from delivery (socket layer / push):
 *
 *   controller  --publish-->  event_bus  --subscribe-->  delivery_service
 *
 * Controllers never import the socket layer directly; they publish domain events
 * and return. The delivery service owns all fan-out (socket emit, push, retries),
 * which keeps the write path fast and the delivery path independently scalable.
 *
 * This is a single-node emitter. Cross-node fan-out of room emits is handled by the
 * Socket.io Redis adapter (see socket/index.js); domain events themselves are
 * processed on the node that owns the originating request, which then emits to the
 * shared adapter rooms.
 */
const { EventEmitter } = require("events");

const EVENTS = Object.freeze({
  MESSAGE_CREATED: "message.created",
  MESSAGE_UPDATED: "message.updated",
  MESSAGE_DELETED: "message.deleted",
  MESSAGE_DELIVERED: "message.delivered",
  MESSAGE_READ: "message.read",
  MESSAGE_EDITED: "message.edited",
  REACTION_UPDATED: "reaction.updated",
  PRESENCE_CHANGED: "presence.changed",
  STATUS_UPDATED: "status.updated",
  NETWORKING_UPDATED: "networking.updated",
  CALLS_UPDATED: "calls.updated",
});

class DomainEventBus extends EventEmitter {
  constructor() {
    super();
    // Chat fan-out can have many listeners across services; lift the default cap.
    this.setMaxListeners(50);
  }

  /**
   * Publish a domain event. Listener errors are isolated so one bad subscriber
   * never breaks the request path or other subscribers.
   */
  publish(event, payload) {
    setImmediate(() => {
      try {
        this.emit(event, payload);
      } catch (err) {
        console.error(`event_bus publish "${event}" failed:`, err);
      }
    });
  }

  /** Subscribe with a guard so listener exceptions don't crash the emitter. */
  subscribe(event, handler) {
    const safe = async (payload) => {
      try {
        await handler(payload);
      } catch (err) {
        console.error(`event_bus handler "${event}" failed:`, err);
      }
    };
    this.on(event, safe);
    return () => this.off(event, safe);
  }
}

const bus = new DomainEventBus();

module.exports = bus;
module.exports.EVENTS = EVENTS;
