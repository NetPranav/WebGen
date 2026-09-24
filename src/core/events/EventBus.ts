"use client";

/**
 * ============================================================================
 * CROSS-PANEL APPLICATION EVENT BUS
 * ============================================================================
 * Central typed pub/sub event bus coordinating actions across panels
 * (Outliner selection, Viewport interactions, Details mutations, Console logs).
 * Architecture Ref: ROADMAP.md §Sub-Phase 2.4 & FOLDER_STRUCTURE_AND_DATA_HIERARCHY.md
 * ============================================================================
 */

export type EventHandler<T = unknown> = (payload: T) => void;

class ApplicationEventBusManager {
  private handlers: Map<string, Set<EventHandler<unknown>>> = new Map();

  /**
   * Emit an event to all registered listeners.
   */
  public emit<T = unknown>(event: string, payload: T): void {
    const set = this.handlers.get(event);
    if (!set) return;

    set.forEach((handler) => {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[EventBus] Error in handler for event '${event}':`, err);
      }
    });
  }

  /**
   * Subscribe to an event. Returns an unsubscribe function.
   */
  public on<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    const set = this.handlers.get(event)!;
    // Callers pair each event name with its payload type; the map stores handlers type-erased.
    const erased = handler as EventHandler<unknown>;
    set.add(erased);

    return () => {
      set.delete(erased);
      if (set.size === 0) {
        this.handlers.delete(event);
      }
    };
  }

  /**
   * Subscribe to an event for a single invocation.
   */
  public once<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    const unsubscribe = this.on<T>(event, (payload) => {
      unsubscribe();
      handler(payload);
    });
    return unsubscribe;
  }

  /**
   * Clear all handlers.
   */
  public clear(): void {
    this.handlers.clear();
  }
}

export const EventBus = new ApplicationEventBusManager();
