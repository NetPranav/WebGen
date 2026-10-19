"use client";

/**
 * ROADMAP Phase 14: renders the registered panel for a zone and tab id. The
 * panel's code is fetched the first time it is shown (React.lazy), and a panel
 * that belongs to the `full` edition renders nothing in the `initial` edition.
 */
import React, { Suspense, createElement, lazy, type ComponentType } from "react";
import { edition } from "@/core/flags";
import { getPanel, markPanelLoaded, resolveFullPagePanel, type PanelDefinition, type PanelZone } from "./registry";
import type { PanelContext } from "./context";

const lazyComponents = new WeakMap<PanelDefinition, ComponentType<object>>();

function componentFor(def: PanelDefinition): ComponentType<object> {
  if (def.component) {
    markPanelLoaded(def.zone, def.id);
    return def.component as ComponentType<object>;
  }
  let component = lazyComponents.get(def);
  if (!component) {
    const load = def.load;
    if (!load) throw new Error(`Panel ${def.zone}:${def.id} has neither a component nor a load()`);
    component = lazy(async () => {
      const loaded = await load();
      markPanelLoaded(def.zone, def.id);
      return { default: loaded as ComponentType<object> };
    });
    lazyComponents.set(def, component);
  }
  return component;
}

interface PanelHostProps {
  zone: PanelZone;
  panelId: string;
  /** The tab's title; full-page panels match on it as well as the id. */
  title?: string;
  context: PanelContext;
  /** A panel supplied by the caller (the `leftPanels` / `rightPanels` … props) wins over the registry. */
  override?: React.ReactNode;
}

export const PanelHost: React.FC<PanelHostProps> = ({ zone, panelId, title = "", context, override }) => {
  if (override) return <>{override}</>;
  const def = zone === "fullpage" ? resolveFullPagePanel(panelId, title) : getPanel(zone, panelId);
  if (!def || (def.edition === "full" && edition !== "full")) return null;

  const Component = componentFor(def);
  const props = def.props ? def.props(context, { panelId, title }) : {};
  return (
    <Suspense fallback={<div className="panel-loading" role="status" aria-label={`Loading ${def.title}`} />}>
      {createElement(Component, props)}
    </Suspense>
  );
};
