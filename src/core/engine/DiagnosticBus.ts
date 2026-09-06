"use client";

/**
 * ============================================================================
 * CENTRAL ENGINE DIAGNOSTIC EVENT BUS
 * ============================================================================
 * Pub/Sub event bus routing structured violations from the runtime engine
 * (validators, type-checkers, compilers) directly to Panel 07 (Output Log).
 * Architecture Ref: ROADMAP.md §Sub-Phase 2.1 & SCHEMA_REFERENCE.md §13.3
 * ============================================================================
 */

import {
  DiagnosticChannel,
  DiagnosticEvent,
  DiagnosticEventListener,
} from "../types/diagnostics";

class DiagnosticBusManager {
  private listeners: Set<DiagnosticEventListener> = new Set();
  private channelListeners: Map<DiagnosticChannel, Set<DiagnosticEventListener>> =
    new Map();
  private history: DiagnosticEvent[] = [];
  private maxHistorySize = 250;

  /**
   * Emit a structured diagnostic event into the engine stream.
   */
  public emit(
    eventData: Omit<DiagnosticEvent, "id" | "timestamp">
  ): DiagnosticEvent {
    const event: DiagnosticEvent = {
      ...eventData,
      id: `diag_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      timestamp: Date.now(),
    };

    // Store in history buffer
    this.history.push(event);
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }

    // Notify global listeners
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error("[DiagnosticBus] Error in global listener:", err);
      }
    });

    // Notify channel-specific listeners
    const channelSet = this.channelListeners.get(event.channel);
    if (channelSet) {
      channelSet.forEach((listener) => {
        try {
          listener(event);
        } catch (err) {
          console.error(
            `[DiagnosticBus] Error in listener for channel ${event.channel}:`,
            err
          );
        }
      });
    }

    return event;
  }

  /**
   * Subscribe to all diagnostic events across all channels.
   * Returns an unsubscribe function.
   */
  public subscribe(listener: DiagnosticEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Subscribe only to events from a specific channel (e.g. 'BIND_ERR').
   */
  public subscribeChannel(
    channel: DiagnosticChannel,
    listener: DiagnosticEventListener
  ): () => void {
    if (!this.channelListeners.has(channel)) {
      this.channelListeners.set(channel, new Set());
    }
    const set = this.channelListeners.get(channel)!;
    set.add(listener);

    return () => {
      set.delete(listener);
      if (set.size === 0) {
        this.channelListeners.delete(channel);
      }
    };
  }

  /**
   * Get all cached events from the current session.
   */
  public getHistory(): DiagnosticEvent[] {
    return [...this.history];
  }

  /**
   * Get events filtered by channel.
   */
  public getHistoryByChannel(channel: DiagnosticChannel): DiagnosticEvent[] {
    return this.history.filter((ev) => ev.channel === channel);
  }

  /**
   * Clear all recorded diagnostics.
   */
  public clearHistory(): void {
    this.history = [];
  }

  /**
   * Convenience helper to report an illegal property binding.
   */
  public reportBindingError(
    target: {
      elementId: string;
      elementName?: string;
      archetype?: string;
      propertyKey: string;
    },
    sourceDesc: string,
    actualType: string,
    allowedCategories: string[],
    fallback: unknown
  ): DiagnosticEvent {
    const msg = `Incompatible Binding: Data source '${sourceDesc}' (${actualType}) cannot bind to property '${target.propertyKey}' on element '${
      target.elementName || target.elementId
    }' (${target.archetype || "generic"}).`;
    const suggestion = `Property '${target.propertyKey}' expects: [${allowedCategories.join(
      ", "
    )}]. Select a compatible source or apply a transform expression.`;

    return this.emit({
      channel: "BIND_ERR",
      severity: "error",
      source: {
        panel: "Panel 03: Inspector / Details",
        entityId: target.elementId,
        entityName: target.elementName,
        archetype: target.archetype,
        propertyKey: target.propertyKey,
      },
      message: msg,
      suggestion,
      targetInspectorSection: "variables",
      isFixable: true,
      fallbackApplied: fallback,
    });
  }

  /**
   * Convenience helper to report an unsupported animation track on an archetype.
   */
  public reportAnimationIncompatibility(
    archetype: string,
    trackId: string,
    validTracks: string[],
    elementId = "unknown",
    elementName?: string
  ): DiagnosticEvent {
    const msg = `Incompatible Track: Animation track '${trackId}' cannot be attached to archetype '${archetype}'.`;
    const suggestion = `Valid tracks for '${archetype}': [${validTracks.join(
      ", "
    )}]. Move this track to a compatible container/element or remove it from the sample.`;

    return this.emit({
      channel: "ANIM_COMPAT",
      severity: "error",
      source: {
        panel: "Panel 06: Motion Blueprint & GSAP Sequencer",
        entityId: elementId,
        entityName: elementName,
        archetype,
        propertyKey: trackId,
      },
      message: msg,
      suggestion,
      targetInspectorSection: "motion",
      isFixable: false,
    });
  }

  /**
   * Convenience helper to report a database schema issue.
   */
  public reportSchemaError(
    collectionName: string,
    message: string,
    suggestion?: string,
    fieldName?: string
  ): DiagnosticEvent {
    return this.emit({
      channel: "DB_SCHEMA_ERR",
      severity: "error",
      source: {
        panel: "Panel 10: Database Designer",
        entityId: collectionName,
        entityName: collectionName,
        propertyKey: fieldName,
      },
      message,
      suggestion,
      isFixable: true,
    });
  }

  /**
   * Convenience helper to report a state variable type/initial-value mismatch warning.
   */
  public reportStateVariableWarning(
    varName: string,
    declaredType: string,
    rawInput: string,
    fallbackValue: unknown,
    scope: string = "global"
  ): DiagnosticEvent {
    const msg = `Type Mismatch on Variable '${varName}': Declared type is '${declaredType}', but initial value string '${rawInput}' is invalid for this type. Coerced to fallback value ${JSON.stringify(fallbackValue)}.`;
    const suggestion = `Provide a valid initial value conforming to '${declaredType}' (e.g., a parseable number for 'number', 'true' or 'false' for 'boolean', or valid JSON syntax).`;

    return this.emit({
      channel: "STATE_VAR_WARN",
      severity: "warning",
      source: {
        panel: "Panel 13: State Matrix",
        entityId: varName,
        entityName: varName,
        archetype: scope,
        propertyKey: "value",
      },
      message: msg,
      suggestion,
      targetInspectorSection: "state-matrix",
      isFixable: true,
      fallbackApplied: fallbackValue,
    });
  }
}

// Export singleton instance
export const DiagnosticBus = new DiagnosticBusManager();
