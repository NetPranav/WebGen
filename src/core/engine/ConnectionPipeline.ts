"use client";

/**
 * ============================================================================
 * UNIVERSAL RUNTIME CONNECTION PIPELINE
 * ============================================================================
 * Manages active property connections across all elements in the application.
 * Evaluates live data sources through DataBindingValidator, caching resolved
 * values and notifying UI components when underlying values change.
 * Architecture Ref: ROADMAP.md §Sub-Phase 2.2 & SCHEMA_REFERENCE.md §13
 * ============================================================================
 */

import {
  DataBindingDescriptor,
  DataContext,
  ResolvedBindingValue,
} from "../types/data-binding";
import { DataBindingValidator } from "./DataBindingValidator";

export type ElementPropertyListener = (
  properties: Record<string, unknown>,
  resolvedDetails: Record<string, ResolvedBindingValue>
) => void;

class ConnectionPipelineManager {
  private bindings: Map<string, DataBindingDescriptor> = new Map();
  private elementListeners: Map<string, Set<ElementPropertyListener>> = new Map();
  private lastResolvedValues: Map<string, Record<string, unknown>> = new Map();

  /**
   * Register a new data binding descriptor into the active pipeline.
   */
  public registerBinding(descriptor: DataBindingDescriptor): void {
    this.bindings.set(descriptor.id, descriptor);
  }

  /**
   * Remove a data binding descriptor from the pipeline.
   */
  public unregisterBinding(id: string): boolean {
    return this.bindings.delete(id);
  }

  /**
   * Retrieve a specific binding by ID.
   */
  public getBinding(id: string): DataBindingDescriptor | undefined {
    return this.bindings.get(id);
  }

  /**
   * Return all registered bindings.
   */
  public getAllBindings(): DataBindingDescriptor[] {
    return Array.from(this.bindings.values());
  }

  /**
   * Get all bindings targeting a specific element ID.
   */
  public getBindingsForElement(elementId: string): DataBindingDescriptor[] {
    return Array.from(this.bindings.values()).filter(
      (b) => b.target.elementId === elementId
    );
  }

  /**
   * Evaluates all bindings targeting a specific element and returns resolved properties.
   */
  public evaluateElementProperties(
    elementId: string,
    context: DataContext
  ): {
    properties: Record<string, unknown>;
    details: Record<string, ResolvedBindingValue>;
  } {
    const elementBindings = this.getBindingsForElement(elementId);
    const properties: Record<string, unknown> = {};
    const details: Record<string, ResolvedBindingValue> = {};

    for (const binding of elementBindings) {
      const resolved = DataBindingValidator.evaluateBinding(binding, context);
      properties[binding.target.propertyKey] = resolved.value;
      details[binding.target.propertyKey] = resolved;
    }

    this.lastResolvedValues.set(elementId, properties);

    // Notify listeners for this element
    const listeners = this.elementListeners.get(elementId);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(properties, details);
        } catch (err) {
          console.error(
            `[ConnectionPipeline] Error notifying listener for element ${elementId}:`,
            err
          );
        }
      });
    }

    return { properties, details };
  }

  /**
   * Evaluates all registered bindings across all elements in the project.
   */
  public evaluateAll(context: DataContext): Map<string, Record<string, unknown>> {
    const elementIds = new Set<string>();
    this.bindings.forEach((b) => elementIds.add(b.target.elementId));

    const results = new Map<string, Record<string, unknown>>();
    elementIds.forEach((id) => {
      const { properties } = this.evaluateElementProperties(id, context);
      results.set(id, properties);
    });

    return results;
  }

  /**
   * Subscribe to property changes for a specific element.
   */
  public subscribeToElement(
    elementId: string,
    listener: ElementPropertyListener
  ): () => void {
    if (!this.elementListeners.has(elementId)) {
      this.elementListeners.set(elementId, new Set());
    }
    const set = this.elementListeners.get(elementId)!;
    set.add(listener);

    return () => {
      set.delete(listener);
      if (set.size === 0) {
        this.elementListeners.delete(elementId);
      }
    };
  }

  /**
   * Clear all registered bindings and listeners.
   */
  public clear(): void {
    this.bindings.clear();
    this.elementListeners.clear();
    this.lastResolvedValues.clear();
  }
}

export const ConnectionPipeline = new ConnectionPipelineManager();
