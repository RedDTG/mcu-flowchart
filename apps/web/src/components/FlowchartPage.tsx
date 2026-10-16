"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, memo } from "react";
import {
  Background,
  BackgroundVariant,
  BaseEdge,
  Controls,
  Edge,
  EdgeProps,
  Handle,
  MarkerType,
  Node,
  NodeProps,
  Panel,
  Position,
  ReactFlow,
  useReactFlow,
  useStore,
  useUpdateNodeInternals,
} from "@xyflow/react";
import { AppNavbar } from "./AppNavbar";
import { apiV1Path, resolvePosterUrl } from "../lib/api";
import { useWatched } from "../lib/useWatched";
import { useToast } from "./Toast";
import flowchartFixedEdgeRoutes from "@/lib/flowchartFixedEdgeRoutes.json";
import flowchartFixedPositions from "@/lib/flowchartFixedPositions.json";
import flowchartUniverseZones from "@/lib/flowchartUniverseZones.json";

type MediaType = "movie" | "show" | "special";
type ConnectionType = "required" | "optional" | "references";
type ThemeMode = "dark" | "light";

interface GraphNode {
  id: string;
  title: string;
  release_date: string;
  saga?: string | null;
  universe: string;
  mediatype: MediaType;
  poster: string;
}

interface GraphEdge {
  source: string;
  target: string;
  type: ConnectionType;
}

interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface MediaDetail {
  id: string;
  title: string;
  release_date: string;
  saga?: string | null;
  universe: string;
  mediatype: MediaType;
  poster: string;
  summary: string;
}

interface UniverseMetadata {
  id: string;
  name: string;
  short_name: string;
  order: number;
  color: string;
}

interface SagaMetadata {
  id: string;
  name: string;
  short_name: string;
  order: number;
}

interface MediaNodeData extends Record<string, unknown> {
  title: string;
  href: string;
  poster: string;
  mediatype: MediaType;
  releaseLabel: string;
  universeLabel: string;
  sagaLabel: string;
  universeColor: string;
  watched?: boolean;
}

interface UniverseGroupNodeData extends Record<string, unknown> {
  universeId: string;
  label: string;
  color: string;
  count: number;
  zoneWidth: number;
  zoneHeight: number;
  polygonPoints?: string;
  polygonPath?: string;
  titleOffsetX: number;
  titleOffsetY: number;
  pinTitleRight: boolean;
}

interface UniverseZoneOverride {
  corners: Array<{ x: number; y: number }> | null;
}

interface EdgeRoutePoint {
  x: number;
  y: number;
}

interface EdgeRouteOverride {
  points: EdgeRoutePoint[];
}

interface FlowEdgeData extends Record<string, unknown> {
  connectionType: ConnectionType;
  routePoints?: EdgeRoutePoint[];
}

type SelectionState =
  | { kind: "none" }
  | { kind: "node"; nodeId: string }
  | { kind: "edge"; edgeId: string; source: string; target: string; connectionType: ConnectionType }
  | { kind: "highlight"; nodeId: string }
  | { kind: "highlight-upstream"; nodeId: string };

interface NodeInternalsRefreshProps {
  nodeIds: string[];
  theme: ThemeMode;
}

const UNIVERSE_GAP = 660;
const NODE_COLUMN_GAP = 26;
const NODE_ROW_GAP = 26;
const SAGA_GAP = 74;
const UNIVERSE_TOP_PADDING = 84;
const NODES_PER_ROW = 2;
const NODE_WIDTH = 250;
const NODE_HEIGHT = 138;
const UNIVERSE_GROUP_PADDING_X = 36;
const UNIVERSE_GROUP_PADDING_Y = 44;
const UNIVERSE_TITLE_MARGIN = 14;
const UNIVERSE_TITLE_MIN_SAFE_WIDTH = 720;
const UNIVERSE_ZONE_CORNER_RADIUS = 50;
const FIXED_EDGE_CORNER_RADIUS = 120;

const EDGE_STYLES_BY_THEME: Record<ThemeMode, Record<ConnectionType, { color: string; label: string }>> = {
  dark: {
    required: { color: "#f87171", label: "Required" },
    optional: { color: "#FFE945", label: "Optional" },
    references: { color: "#60a5fa", label: "Reference" },
  },
  light: {
    required: { color: "#dc2626", label: "Required" },
    optional: { color: "#D6C200", label: "Optional" },
    references: { color: "#1d4ed8", label: "Reference" },
  },
};

function getEdgeOpacity(connectionType: ConnectionType, theme: ThemeMode) {
  if (theme === "light") {
    if (connectionType === "required") {
      return 0.92;
    }

    if (connectionType === "optional") {
      return 0.95;
    }

    return 0.8;
  }

  if (connectionType === "required") {
    return 0.9;
  }

  if (connectionType === "optional") {
    return 0.62;
  }

  return 0.5;
}

const FIXED_NODE_POSITIONS = flowchartFixedPositions as Record<string, { x: number; y: number }>;
const FIXED_EDGE_ROUTES = flowchartFixedEdgeRoutes as Record<string, EdgeRouteOverride>;
const UNIVERSE_ZONE_OVERRIDES = flowchartUniverseZones as Record<string, UniverseZoneOverride>;

const FALLBACK_UNIVERSE_COLORS = ["#ef4444", "#8b5cf6", "#06b6d4", "#f59e0b", "#22c55e", "#ec4899", "#14b8a6"];

function getFixedEdgeRouteKey(connectionType: ConnectionType, source: string, target: string) {
  return `${connectionType}:${source}->${target}`;
}

function getFixedEdgeRoute(connectionType: ConnectionType, source: string, target: string) {
  const route = FIXED_EDGE_ROUTES[getFixedEdgeRouteKey(connectionType, source, target)];

  if (!route?.points?.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y))) {
    return undefined;
  }

  return route.points;
}

function formatDateLabel(dateValue: string) {
  return new Date(dateValue).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatMediaTypeLabel(mediatype: MediaType) {
  return mediatype.charAt(0).toUpperCase() + mediatype.slice(1);
}

function getMediaTypeClass(mediatype: MediaType) {
  if (mediatype === "show") {
    return "text-blue-300";
  }

  if (mediatype === "special") {
    return "text-emerald-300";
  }

  return "text-rose-300";
}

function getMediaTypePillClass(mediatype: MediaType) {
  if (mediatype === "show") {
    return "bg-blue-500/15 text-blue-100 border-blue-400/30";
  }

  if (mediatype === "special") {
    return "bg-emerald-500/15 text-emerald-100 border-emerald-400/30";
  }

  return "bg-rose-500/15 text-rose-100 border-rose-400/30";
}

const hexToRgbaCache: Record<string, string> = {};
const polygonPathCache: Record<string, string> = {};

function hexToRgba(hexColor: string, alpha: number) {
  const key = `${hexColor}:${alpha}`;
  if (hexToRgbaCache[key] !== undefined) {
    return hexToRgbaCache[key];
  }

  const sanitized = hexColor.replace("#", "");
  const value = Number.parseInt(sanitized, 16);

  if (Number.isNaN(value) || sanitized.length !== 6) {
    const result = `rgba(255, 255, 255, ${alpha})`;
    hexToRgbaCache[key] = result;
    return result;
  }

  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;

  const result = `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  hexToRgbaCache[key] = result;
  return result;
}

function buildRoundedPolygonPath(points: Array<{ x: number; y: number }>, radius: number) {
  if (points.length < 3) {
    return "";
  }

  const cacheKey = `${points.map((p) => `${p.x},${p.y}`).join("|")}:${radius}`;
  if (polygonPathCache[cacheKey] !== undefined) {
    return polygonPathCache[cacheKey];
  }

  const segments: string[] = [];

  for (let index = 0; index < points.length; index += 1) {
    const previous = points[(index - 1 + points.length) % points.length];
    const current = points[index];
    const next = points[(index + 1) % points.length];

    const inX = previous.x - current.x;
    const inY = previous.y - current.y;
    const outX = next.x - current.x;
    const outY = next.y - current.y;

    const inLength = Math.hypot(inX, inY);
    const outLength = Math.hypot(outX, outY);

    if (inLength < 0.0001 || outLength < 0.0001) {
      continue;
    }

    const cornerRadius = Math.min(radius, inLength / 2, outLength / 2);

    const startX = current.x + (inX / inLength) * cornerRadius;
    const startY = current.y + (inY / inLength) * cornerRadius;
    const endX = current.x + (outX / outLength) * cornerRadius;
    const endY = current.y + (outY / outLength) * cornerRadius;

    if (segments.length === 0) {
      segments.push(`M ${startX} ${startY}`);
    } else {
      segments.push(`L ${startX} ${startY}`);
    }

    segments.push(`Q ${current.x} ${current.y} ${endX} ${endY}`);
  }

  if (segments.length === 0) {
    return "";
  }

  segments.push("Z");
  const result = segments.join(" ");
  polygonPathCache[cacheKey] = result;
  return result;
}

function buildFixedEdgePath(sourceX: number, sourceY: number, targetX: number, targetY: number, routePoints: EdgeRoutePoint[]) {
  const points = [{ x: sourceX, y: sourceY }, ...routePoints, { x: targetX, y: targetY }];
  const segments = [`M ${sourceX} ${sourceY}`];

  for (let index = 1; index < points.length; index += 1) {
    const current = points[index];

    if (index === points.length - 1) {
      segments.push(`L ${current.x} ${current.y}`);
      continue;
    }

    const previous = points[index - 1];
    const next = points[index + 1];
    const incomingX = current.x - previous.x;
    const incomingY = current.y - previous.y;
    const outgoingX = next.x - current.x;
    const outgoingY = next.y - current.y;
    const incomingLength = Math.hypot(incomingX, incomingY);
    const outgoingLength = Math.hypot(outgoingX, outgoingY);

    if (incomingLength < 0.0001 || outgoingLength < 0.0001) {
      segments.push(`L ${current.x} ${current.y}`);
      continue;
    }

    const radius = Math.min(FIXED_EDGE_CORNER_RADIUS, incomingLength / 2, outgoingLength / 2);
    const cornerStartX = current.x - (incomingX / incomingLength) * radius;
    const cornerStartY = current.y - (incomingY / incomingLength) * radius;
    const cornerEndX = current.x + (outgoingX / outgoingLength) * radius;
    const cornerEndY = current.y + (outgoingY / outgoingLength) * radius;

    segments.push(`L ${cornerStartX} ${cornerStartY}`);
    segments.push(`Q ${current.x} ${current.y} ${cornerEndX} ${cornerEndY}`);
  }

  return segments.join(" ");
}

const FixedRouteEdge = memo(function FixedRouteEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  markerEnd,
  style,
}: EdgeProps<Edge<FlowEdgeData>>) {
  const routePoints = data?.routePoints ?? [];
  const path = buildFixedEdgePath(sourceX, sourceY, targetX, targetY, routePoints);

  return <BaseEdge path={path} markerEnd={markerEnd} style={style} />;
});

function NodeInternalsRefresh({ nodeIds, theme }: NodeInternalsRefreshProps) {
  const { getViewport, setViewport } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      updateNodeInternals(nodeIds);

      window.requestAnimationFrame(() => {
        const viewport = getViewport();

        void setViewport({ ...viewport, x: viewport.x + 0.001 }, { duration: 0 }).then(() => {
          void setViewport(viewport, { duration: 0 });
        });
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [getViewport, nodeIds, setViewport, theme, updateNodeInternals]);

  return null;
}

function FocusController({ nodeIds }: { nodeIds: string[] }) {
  const { fitView, setCenter, getZoom, getNode } = useReactFlow();
  const key = nodeIds.join(",");

  useEffect(() => {
    if (nodeIds.length === 0) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      if (nodeIds.length === 1) {
        const node = getNode(nodeIds[0]);
        if (node) {
          void setCenter(
            node.position.x + NODE_WIDTH / 2,
            node.position.y + NODE_HEIGHT / 2,
            { zoom: Math.max(getZoom(), 0.8), duration: 600 },
          );
        }
      } else {
        void fitView({ nodes: nodeIds.map((id) => ({ id })), duration: 600, padding: 0.45 });
      }
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [key, fitView, setCenter, getZoom, getNode]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

function getNeighbourIds(nodeId: string, edges: Edge<FlowEdgeData>[]): string[] {
  const ids = new Set<string>();

  for (const edge of edges) {
    if (edge.source === nodeId) {
      ids.add(edge.target);
    }

    if (edge.target === nodeId) {
      ids.add(edge.source);
    }
  }

  return [...ids];
}

function getUpstreamIds(
  nodeId: string,
  edges: Edge<FlowEdgeData>[],
  allowedTypes: Set<ConnectionType>,
): Set<string> {
  const visited = new Set<string>();
  const queue = [nodeId];

  while (queue.length > 0) {
    const current = queue.pop()!;

    if (visited.has(current)) {
      continue;
    }

    visited.add(current);

    for (const edge of edges) {
      if (edge.target === current && allowedTypes.has(edge.data?.connectionType as ConnectionType)) {
        if (!visited.has(edge.source)) {
          queue.push(edge.source);
        }
      }
    }
  }

  return visited;
}

const MediaFlowNode = memo(function MediaFlowNode({ data, selected }: NodeProps<Node<MediaNodeData>>) {
  const zoom = useStore((state) => state.transform[2]);
  const isLowZoom = zoom < 0.3;

  if (isLowZoom) {
    return (
      <div
        className={`relative h-full w-full rounded-lg border transition duration-200 ${selected ? "border-white/60" : "border-white/10"}`}
        style={{
          backgroundColor: hexToRgba(data.universeColor, 0.3),
          boxShadow: `0 0 0 1px ${hexToRgba(data.universeColor, 0.38)}`,
        }}
      >
        <Handle type="target" position={Position.Top} className="h-2! w-2! border-0! bg-transparent! opacity-0!" />
        <Handle type="source" position={Position.Bottom} className="h-2! w-2! border-0! bg-transparent! opacity-0!" />
        {data.watched === true && (
          <div className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-emerald-500" />
        )}
      </div>
    );
  }

  return (
    <article
      className={`group h-full w-full overflow-hidden rounded-2xl border bg-zinc-950/95 shadow-[0_16px_40px_rgba(0,0,0,0.3)] transition duration-200 ${selected ? "border-white/60" : "border-white/10"}`}
      style={{ boxShadow: `0 0 0 1px ${hexToRgba(data.universeColor, 0.38)}, 0 16px 40px rgba(0, 0, 0, 0.3)` }}
    >
      <Handle type="target" position={Position.Top} className="h-2! w-2! border-0! bg-transparent! opacity-0!" />
      <Handle type="source" position={Position.Bottom} className="h-2! w-2! border-0! bg-transparent! opacity-0!" />

      <div className="nodrag nopan flex h-full cursor-pointer gap-3 p-3">
        <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-zinc-800">
          <Image src={resolvePosterUrl(data.poster)} alt={data.title} fill className="object-cover" sizes="80px" unoptimized />
          {data.watched === true && (
            <div className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 shadow">
              <svg viewBox="0 0 10 10" className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1.5 5l2.5 2.5 4.5-4" />
              </svg>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate text-[10px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
              {data.universeLabel}
            </span>
            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${getMediaTypePillClass(data.mediatype)}`}>
              {formatMediaTypeLabel(data.mediatype)}
            </span>
          </div>

          <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-tight text-white">
            {data.title}
          </h3>

          <p className={`mt-2 text-xs font-medium ${getMediaTypeClass(data.mediatype)}`}>
            {data.releaseLabel}
          </p>

          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-zinc-300">
            {data.sagaLabel}
          </p>
        </div>
      </div>
    </article>
  );
});

const UniverseGroupNode = memo(function UniverseGroupNode({ data }: NodeProps<Node<UniverseGroupNodeData>>) {
  const isPolygonZone = Boolean(data.polygonPoints);

  return (
    <article
      className={`relative h-full w-full ${isPolygonZone ? "border-0 bg-transparent" : "rounded-3xl border bg-zinc-900/10"}`}
      style={{
        borderColor: isPolygonZone ? undefined : hexToRgba(data.color, 0.85),
        backgroundColor: isPolygonZone ? undefined : hexToRgba(data.color, 0.24),
        boxShadow: isPolygonZone ? undefined : `inset 0 0 0 1px ${hexToRgba(data.color, 0.45)}`,
      }}
    >
      {data.polygonPoints ? (
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox={`0 0 ${data.zoneWidth} ${data.zoneHeight}`}
          preserveAspectRatio="none"
        >
          {data.polygonPath ? (
            <>
              <path
                d={data.polygonPath}
                fill={hexToRgba(data.color, 0.24)}
                stroke={hexToRgba(data.color, 0.85)}
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d={data.polygonPath}
                fill="none"
                stroke={hexToRgba(data.color, 0.45)}
                strokeWidth={1}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </>
          ) : (
            <>
              <polygon
                points={data.polygonPoints}
                fill={hexToRgba(data.color, 0.24)}
                stroke={hexToRgba(data.color, 0.85)}
                strokeWidth={2.5}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
              <polygon
                points={data.polygonPoints}
                fill="none"
                stroke={hexToRgba(data.color, 0.45)}
                strokeWidth={1}
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </>
          )}
        </svg>
      ) : null}

      <div
        className="pointer-events-none absolute rounded-2xl border border-white/30 bg-black/55 px-4 py-2 text-white/95 shadow-lg"
        style={{
          left: data.pinTitleRight ? undefined : data.titleOffsetX,
          right: data.pinTitleRight ? UNIVERSE_TITLE_MARGIN : undefined,
          top: data.titleOffsetY,
          maxWidth: `calc(100% - ${UNIVERSE_TITLE_MARGIN * 2}px)`,
        }}
      >
        <p className="text-8xl font-black uppercase tracking-[0.14em] leading-none">
          {data.label}
        </p>
        <p className="mt-1 text-4xl font-semibold uppercase tracking-[0.16em] text-white/80">
          {data.count} titles
        </p>
      </div>
    </article>
  );
});

const FLOW_NODE_TYPES = {
  mediaNode: MediaFlowNode,
  universeGroup: UniverseGroupNode,
};

const FLOW_EDGE_TYPES = {
  fixedRoute: FixedRouteEdge,
};

function buildUniverseIndex(universes: UniverseMetadata[], nodes: GraphNode[]) {
  const usedUniverses = new Set(nodes.map((node) => node.universe));
  const orderedUniverses = universes
    .filter((universe) => usedUniverses.has(universe.id))
    .sort((left, right) => {
      if (left.order !== right.order) {
        return left.order - right.order;
      }

      return left.short_name.localeCompare(right.short_name);
    })
    .map((universe) => universe.id);

  const unknownUniverses = [...usedUniverses].filter((universeId) => !orderedUniverses.includes(universeId)).sort();

  return [...orderedUniverses, ...unknownUniverses];
}

function buildFlowElements(
  graph: GraphResponse,
  universes: UniverseMetadata[],
  sagas: SagaMetadata[],
  edgeStyles: Record<ConnectionType, { color: string; label: string }>,
  theme: ThemeMode,
) {
  const universeById = Object.fromEntries(universes.map((universe) => [universe.id, universe])) as Record<
    string,
    UniverseMetadata
  >;
  const sagaById = Object.fromEntries(sagas.map((saga) => [saga.id, saga])) as Record<string, SagaMetadata>;
  const universeOrder = buildUniverseIndex(universes, graph.nodes);
  const nodesByUniverse = new Map<string, GraphNode[]>();

  for (const node of graph.nodes) {
    const current = nodesByUniverse.get(node.universe) ?? [];
    current.push(node);
    nodesByUniverse.set(node.universe, current);
  }

  const positionByNodeId = new Map<string, { x: number; y: number }>();

  for (const [universeIndex, universeId] of universeOrder.entries()) {
    const universeNodes = [...(nodesByUniverse.get(universeId) ?? [])].sort((left, right) => {
      const leftDate = new Date(left.release_date).getTime();
      const rightDate = new Date(right.release_date).getTime();

      if (leftDate !== rightDate) {
        return leftDate - rightDate;
      }

      return left.title.localeCompare(right.title);
    });

    const groupsBySaga = new Map<string, GraphNode[]>();
    for (const node of universeNodes) {
      const sagaKey = node.saga ?? "standalone";
      const current = groupsBySaga.get(sagaKey) ?? [];
      current.push(node);
      groupsBySaga.set(sagaKey, current);
    }

    const sagaGroups = [...groupsBySaga.entries()]
      .map(([sagaKey, items]) => {
        const earliestRelease = Math.min(...items.map((item) => new Date(item.release_date).getTime()));
        const sagaOrder = sagaById[sagaKey]?.order ?? Number.MAX_SAFE_INTEGER;

        return {
          sagaKey,
          items: [...items].sort((left, right) => {
            const leftDate = new Date(left.release_date).getTime();
            const rightDate = new Date(right.release_date).getTime();
            if (leftDate !== rightDate) {
              return leftDate - rightDate;
            }
            return left.title.localeCompare(right.title);
          }),
          earliestRelease,
          sagaOrder,
        };
      })
      .sort((left, right) => {
        if (left.sagaOrder !== right.sagaOrder) {
          return left.sagaOrder - right.sagaOrder;
        }
        if (left.earliestRelease !== right.earliestRelease) {
          return left.earliestRelease - right.earliestRelease;
        }
        return left.sagaKey.localeCompare(right.sagaKey);
      });

    let yCursor = UNIVERSE_TOP_PADDING;

    for (const group of sagaGroups) {
      for (const [localIndex, node] of group.items.entries()) {
        const row = Math.floor(localIndex / NODES_PER_ROW);
        const col = localIndex % NODES_PER_ROW;

        const x = universeIndex * UNIVERSE_GAP + col * (NODE_WIDTH + NODE_COLUMN_GAP);
        const y = yCursor + row * (NODE_HEIGHT + NODE_ROW_GAP);

        positionByNodeId.set(node.id, { x, y });
      }

      const rowsUsed = Math.ceil(group.items.length / NODES_PER_ROW);
      yCursor += rowsUsed * (NODE_HEIGHT + NODE_ROW_GAP) + SAGA_GAP;
    }
  }

  const layoutedNodes: Node<MediaNodeData>[] = graph.nodes.map((node) => {
    const universe = universeById[node.universe];
    const saga = node.saga ? sagaById[node.saga] : null;
    const universeIndex = universeOrder.findIndex((universeId) => universeId === node.universe);
    const fallbackColor = FALLBACK_UNIVERSE_COLORS[universeIndex % FALLBACK_UNIVERSE_COLORS.length];
    const universeColor = universe?.color ?? fallbackColor;
    const position = FIXED_NODE_POSITIONS[node.id] ?? positionByNodeId.get(node.id) ?? { x: 0, y: 0 };

    return {
      id: node.id,
      type: "mediaNode",
      position,
      zIndex: 20,
      data: {
        title: node.title,
        href: `/media/${node.id}`,
        poster: node.poster,
        mediatype: node.mediatype,
        releaseLabel: formatDateLabel(node.release_date),
        universeLabel: universe?.short_name ?? node.universe,
        sagaLabel: saga ? saga.short_name || saga.name : "Standalone title",
        universeColor,
      },
      style: {
        width: NODE_WIDTH,
        height: NODE_HEIGHT,
      },
    };
  });

  const universeGroupNodes: Node<UniverseGroupNodeData>[] = universeOrder.flatMap((universeId, index) => {
    const universeNodes = nodesByUniverse.get(universeId) ?? [];

    if (universeNodes.length === 0) {
      return [];
    }

    let minX = Number.POSITIVE_INFINITY;
    let minY = Number.POSITIVE_INFINITY;
    let maxX = Number.NEGATIVE_INFINITY;
    let maxY = Number.NEGATIVE_INFINITY;

    for (const node of universeNodes) {
      const nodePosition = positionByNodeId.get(node.id) ?? FIXED_NODE_POSITIONS[node.id];
      if (!nodePosition) {
        continue;
      }

      minX = Math.min(minX, nodePosition.x);
      minY = Math.min(minY, nodePosition.y);
      maxX = Math.max(maxX, nodePosition.x + NODE_WIDTH);
      maxY = Math.max(maxY, nodePosition.y + NODE_HEIGHT);
    }

    if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
      return [];
    }

    const universe = universeById[universeId];
    const fallbackColor = FALLBACK_UNIVERSE_COLORS[index % FALLBACK_UNIVERSE_COLORS.length];
    const color = universe?.color ?? fallbackColor;
    const zoneOverride = UNIVERSE_ZONE_OVERRIDES[universeId];
    const hasCustomCorners =
      Array.isArray(zoneOverride?.corners) &&
      zoneOverride.corners.length >= 3 &&
      zoneOverride.corners.every(
        (corner) =>
          typeof corner?.x === "number" &&
          Number.isFinite(corner.x) &&
          typeof corner?.y === "number" &&
          Number.isFinite(corner.y),
      );

    const defaultZoneX = minX - UNIVERSE_GROUP_PADDING_X;
    const defaultZoneY = minY - UNIVERSE_GROUP_PADDING_Y;
    const defaultZoneWidth = maxX - minX + UNIVERSE_GROUP_PADDING_X * 2;
    const defaultZoneHeight = maxY - minY + UNIVERSE_GROUP_PADDING_Y * 2;

    const corners = hasCustomCorners ? zoneOverride!.corners! : null;

    const zoneX = corners ? Math.min(...corners.map((corner) => corner.x)) : defaultZoneX;
    const zoneY = corners ? Math.min(...corners.map((corner) => corner.y)) : defaultZoneY;
    const zoneWidth = corners ? Math.max(...corners.map((corner) => corner.x)) - zoneX : defaultZoneWidth;
    const zoneHeight = corners ? Math.max(...corners.map((corner) => corner.y)) - zoneY : defaultZoneHeight;

    const safeZoneWidth = zoneWidth > 0 ? zoneWidth : 1;
    const safeZoneHeight = zoneHeight > 0 ? zoneHeight : 1;
    const localCorners = corners
      ? corners.map((corner) => ({
          x: corner.x - zoneX,
          y: corner.y - zoneY,
        }))
      : null;

    const polygonPoints = corners
      ? localCorners!.map((corner) => `${corner.x},${corner.y}`).join(" ")
      : undefined;
    const polygonPath = corners
      ? buildRoundedPolygonPath(localCorners!, UNIVERSE_ZONE_CORNER_RADIUS)
      : undefined;
    const firstCorner = corners?.[0];
    const titleOffsetX = firstCorner ? firstCorner.x - zoneX + UNIVERSE_TITLE_MARGIN : 16;
    const titleOffsetY = firstCorner ? firstCorner.y - zoneY + UNIVERSE_TITLE_MARGIN : 16;
    const pinTitleRight = zoneWidth - titleOffsetX < UNIVERSE_TITLE_MIN_SAFE_WIDTH + UNIVERSE_TITLE_MARGIN;

    return [
      {
        id: `universe-group-${universeId}`,
        type: "universeGroup",
        position: {
          x: zoneX,
          y: zoneY,
        },
        zIndex: 1,
        draggable: false,
        selectable: false,
        focusable: false,
        data: {
          universeId,
          label: universe?.short_name ?? universeId,
          color,
          count: universeNodes.length,
          zoneWidth: safeZoneWidth,
          zoneHeight: safeZoneHeight,
          polygonPoints,
          polygonPath,
          titleOffsetX,
          titleOffsetY,
          pinTitleRight,
        },
        style: {
          width: zoneWidth,
          height: zoneHeight,
          pointerEvents: "none",
        },
      },
    ];
  });

  const seenEdges = new Set<string>();

  const layoutedEdges: Edge<FlowEdgeData>[] = graph.edges.flatMap((edge) => {
    if (edge.source === edge.target) {
      return [];
    }

    const edgeKey = `${edge.type}:${edge.target}->${edge.source}`;
    if (seenEdges.has(edgeKey)) {
      return [];
    }

    seenEdges.add(edgeKey);
    const style = edgeStyles[edge.type];
    const opacity = getEdgeOpacity(edge.type, theme);
    const strokeWidth = edge.type === "required" ? 3.2 : 2.6;
    const strokeDasharray = edge.type === "references" ? "8 6" : undefined;
    const source = edge.target;
    const target = edge.source;
    const routePoints = getFixedEdgeRoute(edge.type, source, target);

    return [{
      id: `${edge.type}-${edge.source}-${edge.target}`,
      source,
      target,
      type: routePoints ? "fixedRoute" : "simplebezier",
      animated: false,
      data: { connectionType: edge.type, ...(routePoints ? { routePoints } : {}) },
      style: {
        stroke: style.color,
        strokeWidth,
        strokeDasharray,
        opacity,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: style.color,
      },
    }];
  });

  const universeLegend = universeOrder.map((universeId, index) => {
    const universe = universeById[universeId];
    const count = nodesByUniverse.get(universeId)?.length ?? 0;
    const fallbackColor = FALLBACK_UNIVERSE_COLORS[index % FALLBACK_UNIVERSE_COLORS.length];

    return {
      id: universeId,
      name: universe?.short_name ?? universeId,
      color: universe?.color ?? fallbackColor,
      count,
    };
  });

  return { nodes: [...universeGroupNodes, ...layoutedNodes], edges: layoutedEdges, universeLegend };
}

export function FlowchartPage() {
  const [graph, setGraph] = useState<GraphResponse | null>(null);
  const [universes, setUniverses] = useState<UniverseMetadata[]>([]);
  const [sagas, setSagas] = useState<SagaMetadata[]>([]);
  const [allMedia, setAllMedia] = useState<MediaDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [selection, setSelection] = useState<SelectionState>({ kind: "none" });
  const [hideWatched, setHideWatched] = useState(false);
  const [upstreamTypes, setUpstreamTypes] = useState<Set<ConnectionType>>(new Set(["required"]));
  const [panelMode, setPanelMode] = useState<"normal" | "mark-upstream">("normal");

  const { watchedIds, isWatched, toggle: toggleWatched } = useWatched();
  const { showToast } = useToast();

  useEffect(() => {
    document.body.classList.add("flowchart-route");

    return () => {
      document.body.classList.remove("flowchart-route");
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelection({ kind: "none" });
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const resolveTheme = () => (root.dataset.theme === "light" ? "light" : "dark");

    setTheme(resolveTheme());

    const observer = new MutationObserver(() => {
      setTheme(resolveTheme());
    });

    observer.observe(root, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const loadGraph = async () => {
      try {
        const [graphResponse, universesResponse, sagasResponse, mediaResponse] = await Promise.all([
          fetch(apiV1Path("/graph")),
          fetch(apiV1Path("/universes")),
          fetch(apiV1Path("/sagas")),
          fetch(apiV1Path("/media")),
        ]);

        if (!graphResponse.ok) {
          throw new Error(`Graph API error: ${graphResponse.status}`);
        }

        if (!universesResponse.ok) {
          throw new Error(`Universes API error: ${universesResponse.status}`);
        }

        if (!sagasResponse.ok) {
          throw new Error(`Sagas API error: ${sagasResponse.status}`);
        }

        if (!mediaResponse.ok) {
          throw new Error(`Media API error: ${mediaResponse.status}`);
        }

        const graphData = (await graphResponse.json()) as GraphResponse;
        const universeData = (await universesResponse.json()) as UniverseMetadata[];
        const sagaData = (await sagasResponse.json()) as SagaMetadata[];
        const mediaData = (await mediaResponse.json()) as MediaDetail[];

        setGraph(graphData);
        setUniverses(universeData);
        setSagas(sagaData);
        setAllMedia(mediaData);
        setError(null);
      } catch (fetchError) {
        const message =
          fetchError instanceof TypeError
            ? "Impossible de joindre l’API. Vérifie que le backend est démarré et accessible."
            : fetchError instanceof Error
              ? fetchError.message
              : "Échec du chargement du flowchart";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    loadGraph();
  }, []);

  const edgeStyles = useMemo(() => EDGE_STYLES_BY_THEME[theme], [theme]);

  const flowState = useMemo(() => {
    if (!graph) {
      return null;
    }

    return buildFlowElements(graph, universes, sagas, edgeStyles, theme);
  }, [edgeStyles, graph, sagas, theme, universes]);
  const graphNodeIds = useMemo(() => graph?.nodes.map((node) => node.id) ?? [], [graph]);

  const mediaById = useMemo(() => new Map(allMedia.map((m) => [m.id, m])), [allMedia]);

  const nodeTitleById = useMemo(() => {
    const map = new Map<string, string>();
    for (const node of graph?.nodes ?? []) {
      map.set(node.id, node.title);
    }
    return map;
  }, [graph]);

  const displayNodes = useMemo(() => {
    if (!flowState) {
      return [];
    }

    const state = flowState;

    function applyBase(node: (typeof state.nodes)[number]) {
      if (node.type !== "mediaNode") {
        return node;
      }

      const watched = watchedIds.has(node.id);
      const dimmed = hideWatched && watched;

      return {
        ...node,
        data: { ...node.data, watched },
        style: dimmed ? { ...node.style, opacity: 0.15 } : node.style,
      };
    }

    if (selection.kind === "none") {
      return flowState.nodes.map(applyBase);
    }

    if (selection.kind === "node") {
      return flowState.nodes.map((node) => {
        const base = applyBase(node);
        return node.id === selection.nodeId ? { ...base, selected: true } : base;
      });
    }

    if (selection.kind === "edge") {
      return flowState.nodes.map((node) => {
        const base = applyBase(node);
        return node.id === selection.source || node.id === selection.target
          ? { ...base, selected: true }
          : base;
      });
    }

    if (selection.kind === "highlight-upstream") {
      const upstreamIds = getUpstreamIds(selection.nodeId, flowState.edges, upstreamTypes);

      return flowState.nodes.map((node) => {
        const base = applyBase(node);

        if (node.type !== "mediaNode") {
          return base;
        }

        if (upstreamIds.has(node.id)) {
          return { ...base, selected: true };
        }

        return { ...base, style: { ...base.style, opacity: 0.15 } };
      });
    }

    const neighbourIds = getNeighbourIds(selection.nodeId, flowState.edges);
    const highlightIds = new Set([selection.nodeId, ...neighbourIds]);

    return flowState.nodes.map((node) => {
      const base = applyBase(node);

      if (node.type !== "mediaNode") {
        return base;
      }

      if (highlightIds.has(node.id)) {
        return { ...base, selected: true };
      }

      return { ...base, style: { ...base.style, opacity: 0.15 } };
    });
  }, [flowState, selection, watchedIds, hideWatched, upstreamTypes]);

  const displayEdges = useMemo(() => {
    if (!flowState) {
      return [];
    }

    if (selection.kind === "none" || selection.kind === "node") {
      return flowState.edges;
    }

    if (selection.kind === "edge") {
      return flowState.edges.map((edge) => {
        const baseStyle = edge.style ?? {};
        if (edge.id === selection.edgeId) {
          return {
            ...edge,
            zIndex: 1000,
            style: {
              ...baseStyle,
              opacity: 1,
              strokeWidth: ((baseStyle.strokeWidth as number) ?? 2.6) + 2,
            },
          };
        }
        return {
          ...edge,
          style: {
            ...baseStyle,
            opacity: ((baseStyle.opacity as number) ?? 1) * 0.15,
          },
        };
      });
    }

    if (selection.kind === "highlight-upstream") {
      const upstreamIds = getUpstreamIds(selection.nodeId, flowState.edges, upstreamTypes);
      return flowState.edges.map((edge) => {
        const baseStyle = edge.style ?? {};
        const isInChain = upstreamIds.has(edge.source) && upstreamIds.has(edge.target);
        if (isInChain) {
          return {
            ...edge,
            zIndex: 1000,
            style: {
              ...baseStyle,
              opacity: 1,
              strokeWidth: ((baseStyle.strokeWidth as number) ?? 2.6) + 2,
            },
          };
        }
        return {
          ...edge,
          style: {
            ...baseStyle,
            opacity: ((baseStyle.opacity as number) ?? 1) * 0.15,
          },
        };
      });
    }

    return flowState.edges.map((edge) => {
      const baseStyle = edge.style ?? {};
      const isHighlighted = edge.source === selection.nodeId || edge.target === selection.nodeId;

      if (isHighlighted) {
        return {
          ...edge,
          zIndex: 1000,
          style: {
            ...baseStyle,
            opacity: 1,
            strokeWidth: ((baseStyle.strokeWidth as number) ?? 2.6) + 2,
          },
        };
      }

      return {
        ...edge,
        style: {
          ...baseStyle,
          opacity: ((baseStyle.opacity as number) ?? 1) * 0.15,
        },
      };
    });
  }, [flowState, selection, upstreamTypes]);

  const focusNodeIds = useMemo(() => {
    if (!flowState) {
      return [];
    }

    if (selection.kind === "node") {
      return [selection.nodeId];
    }

    if (selection.kind === "edge") {
      return [selection.source, selection.target];
    }

    if (selection.kind === "highlight") {
      return [selection.nodeId, ...getNeighbourIds(selection.nodeId, flowState.edges)];
    }

    if (selection.kind === "highlight-upstream") {
      return [...getUpstreamIds(selection.nodeId, flowState.edges, upstreamTypes)];
    }

    return [];
  }, [selection, flowState, upstreamTypes]);

  const highlightInfo = useMemo(() => {
    if (selection.kind === "highlight" && flowState) {
      const { nodeId } = selection;
      const inCount = flowState.edges.filter((e) => e.target === nodeId).length;
      const outCount = flowState.edges.filter((e) => e.source === nodeId).length;
      return { title: nodeTitleById.get(nodeId) ?? nodeId, inCount, outCount, kind: "highlight" as const };
    }

    if (selection.kind === "highlight-upstream" && flowState) {
      const { nodeId } = selection;
      const upstreamIds = getUpstreamIds(nodeId, flowState.edges, upstreamTypes);
      const count = upstreamIds.size - 1;
      return { title: nodeTitleById.get(nodeId) ?? nodeId, count, kind: "highlight-upstream" as const };
    }

    return null;
  }, [selection, flowState, nodeTitleById, upstreamTypes]);

  const panelMedia = selection.kind === "node" ? (mediaById.get(selection.nodeId) ?? null) : null;

  const upstreamMediaList = useMemo(() => {
    if (selection.kind !== "node" || !flowState) {
      return [];
    }

    const ids = getUpstreamIds(selection.nodeId, flowState.edges, upstreamTypes);
    return [...ids]
      .map((id) => mediaById.get(id))
      .filter((m): m is NonNullable<typeof m> => m != null)
      .sort((a, b) => a.release_date.localeCompare(b.release_date));
  }, [selection, flowState, upstreamTypes, mediaById]);

  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (node.type !== "mediaNode") {
      return;
    }

    setSelection((prev) =>
      prev.kind === "node" && prev.nodeId === node.id
        ? { kind: "none" }
        : { kind: "node", nodeId: node.id },
    );
    setPanelMode("normal");
  }, []);

  const handleEdgeClick = useCallback((_event: React.MouseEvent, edge: Edge<FlowEdgeData>) => {
    setSelection({
      kind: "edge",
      edgeId: edge.id,
      source: edge.source,
      target: edge.target,
      connectionType: edge.data?.connectionType ?? "required",
    });
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelection({ kind: "none" });
    setPanelMode("normal");
  }, []);

  const handleHighlight = useCallback((nodeId: string) => {
    setSelection({ kind: "highlight", nodeId });
  }, []);

  const handleHighlightUpstream = useCallback((nodeId: string) => {
    setSelection({ kind: "highlight-upstream", nodeId });
  }, []);

  const toggleUpstreamType = useCallback((type: ConnectionType) => {
    setUpstreamTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        if (next.size === 1) {
          return prev;
        }
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-linear-to-b from-zinc-800 via-zinc-800 to-zinc-800 text-white">
      <AppNavbar />

      <main className="min-h-0 flex-1">
        <section className="h-full w-full overflow-hidden">
          {loading && (
            <div className="flex min-h-[60vh] h-full items-center justify-center px-6 text-sm text-zinc-300">
              Chargement du graphe…
            </div>
          )}

          {error && !loading && (
            <div className="flex min-h-[60vh] h-full items-center justify-center px-6 text-center text-sm text-rose-200">
              <p className="max-w-xl rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
                {error}
              </p>
            </div>
          )}

          {!loading && !error && flowState && (
            <div className="relative h-full w-full">
              <ReactFlow
                 nodes={displayNodes}
                 edges={displayEdges}
                 nodeTypes={FLOW_NODE_TYPES}
                 edgeTypes={FLOW_EDGE_TYPES}
                 defaultViewport={{ x: 500, y: 200, zoom: 0.5 }}
                 minZoom={0.05}
                 maxZoom={1.35}
                 defaultEdgeOptions={{ type: "simplebezier" }}
                 proOptions={{ hideAttribution: true }}
                 nodesDraggable={false}
                 nodesConnectable={false}
                 onNodeClick={handleNodeClick}
                 onEdgeClick={handleEdgeClick}
                 onPaneClick={handlePaneClick}
               >
                <NodeInternalsRefresh nodeIds={graphNodeIds} theme={theme} />
                <FocusController nodeIds={focusNodeIds} />
                <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(255, 255, 255, 0.08)" />
                <Controls
                  position={selection.kind === "node" ? "bottom-left" : "bottom-right"}
                  showInteractive={false}
                  className="workflow-controls bg-white/95 shadow-xl [&_button]:border-zinc-300 [&_button]:bg-white [&_button:hover]:bg-zinc-100"
                />
                <Panel position="top-left">
                  <div className="max-h-[42vh] overflow-auto rounded-2xl border border-zinc-800 bg-zinc-950/90 px-3 py-2 text-xs text-zinc-200 shadow-xl">
                    <p className="font-semibold uppercase tracking-[0.24em] text-zinc-400">Relations</p>
                    <div className="mt-2 space-y-1.5">
                      {Object.entries(edgeStyles).map(([type, config]) => (
                        <div key={type} className="flex items-center gap-2 text-zinc-200">
                          <span
                            className="h-0.5 w-5 rounded-full"
                            style={{
                              backgroundColor: config.color,
                              opacity: getEdgeOpacity(type as ConnectionType, theme),
                            }}
                          />
                          <span className="truncate">{config.label}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 border-t border-zinc-800 pt-2.5">
                      <p className="text-zinc-400">
                        {watchedIds.size} / {allMedia.length} watched
                      </p>
                      <button
                        type="button"
                        onClick={() => setHideWatched((v) => !v)}
                        className={`mt-1.5 w-full rounded-lg border px-2 py-1 text-left transition ${hideWatched ? "border-emerald-700 bg-emerald-900/30 text-emerald-300" : "border-zinc-700 text-zinc-400 hover:text-zinc-200"}`}
                      >
                        {hideWatched ? "Showing unwatched" : "Hide watched"}
                      </button>
                    </div>
                  </div>
                </Panel>
                {selection.kind === "edge" && (
                  <Panel position="bottom-center">
                    <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/95 px-4 py-2.5 text-xs text-zinc-200 shadow-xl">
                      <span
                        className="shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                        style={{
                          borderColor: edgeStyles[selection.connectionType].color,
                          color: edgeStyles[selection.connectionType].color,
                        }}
                      >
                        {edgeStyles[selection.connectionType].label}
                      </span>
                      <span className="font-medium text-white">
                        {nodeTitleById.get(selection.source) ?? selection.source}
                      </span>
                      <span className="text-zinc-500">→</span>
                      <span className="font-medium text-white">
                        {nodeTitleById.get(selection.target) ?? selection.target}
                      </span>
                      <button
                        type="button"
                        onClick={handlePaneClick}
                        className="ml-1 shrink-0 rounded-full px-1.5 text-zinc-400 hover:text-white"
                        aria-label="Close"
                      >
                        ×
                      </button>
                    </div>
                  </Panel>
                )}
                {highlightInfo?.kind === "highlight" && (
                  <Panel position="bottom-center">
                    <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/95 px-4 py-2.5 text-xs text-zinc-200 shadow-xl">
                      <span className="font-medium text-white">{highlightInfo.title}</span>
                      <span className="text-zinc-500">·</span>
                      <span className="text-zinc-300">↙ {highlightInfo.inCount} in</span>
                      <span className="text-zinc-500">·</span>
                      <span className="text-zinc-300">↗ {highlightInfo.outCount} out</span>
                      <button
                        type="button"
                        onClick={handlePaneClick}
                        className="ml-1 shrink-0 rounded-full px-1.5 text-zinc-400 hover:text-white"
                        aria-label="Close"
                      >
                        ×
                      </button>
                    </div>
                  </Panel>
                )}
                {highlightInfo?.kind === "highlight-upstream" && (
                  <Panel position="bottom-center">
                    <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/95 px-4 py-2.5 text-xs text-zinc-200 shadow-xl">
                      <span className="font-medium text-white">{highlightInfo.title}</span>
                      <span className="text-zinc-500">·</span>
                      <span className="text-zinc-300">↑ {highlightInfo.count} upstream</span>
                      <button
                        type="button"
                        onClick={handlePaneClick}
                        className="ml-1 shrink-0 rounded-full px-1.5 text-zinc-400 hover:text-white"
                        aria-label="Close"
                      >
                        ×
                      </button>
                    </div>
                  </Panel>
                )}
              </ReactFlow>

              {selection.kind === "node" && panelMedia && (
                <aside className="panel-slide-in absolute right-0 top-0 z-50 flex h-full w-[360px] flex-col overflow-y-auto border-l border-zinc-800 bg-zinc-950 shadow-2xl">
                  <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-4 py-3">
                    <span className={`text-xs font-semibold uppercase tracking-[0.2em] ${getMediaTypeClass(panelMedia.mediatype)}`}>
                      {formatMediaTypeLabel(panelMedia.mediatype)}
                    </span>
                    <button
                      type="button"
                      onClick={handlePaneClick}
                      className="rounded-full px-1.5 text-lg text-zinc-400 hover:text-white"
                      aria-label="Close panel"
                    >
                      ×
                    </button>
                  </div>

                  <div className="relative mx-auto mt-5 aspect-[2/3] w-36 shrink-0 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
                    <Image
                      src={resolvePosterUrl(panelMedia.poster)}
                      alt={panelMedia.title}
                      fill
                      className="object-cover"
                      sizes="144px"
                      unoptimized
                    />
                  </div>

                  <div className="flex flex-1 flex-col px-4 pb-6 pt-4">
                    {panelMode === "mark-upstream" ? (
                      <>
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-semibold text-white">Mark up to this point</p>
                          <button
                            type="button"
                            onClick={() => setPanelMode("normal")}
                            className="text-xs text-zinc-500 hover:text-zinc-200"
                          >
                            Cancel
                          </button>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {(["required", "optional", "references"] as ConnectionType[]).map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => toggleUpstreamType(type)}
                              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition ${upstreamTypes.has(type) ? "border-transparent text-white" : "border-zinc-700 text-zinc-500"}`}
                              style={upstreamTypes.has(type) ? { backgroundColor: edgeStyles[type].color + "33", borderColor: edgeStyles[type].color, color: edgeStyles[type].color } : undefined}
                            >
                              {edgeStyles[type].label}
                            </button>
                          ))}
                        </div>

                        <div className="mt-3 flex-1 overflow-y-auto">
                          {upstreamMediaList.map((item) => (
                            <div
                              key={item.id}
                              className={`flex items-center gap-2 border-b border-zinc-800/60 py-1.5 text-xs ${isWatched(item.id) ? "text-zinc-600" : "text-zinc-300"}`}
                            >
                              {isWatched(item.id) && <span className="text-emerald-600">✓</span>}
                              <span className="truncate">{item.title}</span>
                            </div>
                          ))}
                        </div>

                        {(() => {
                          const unwatchedCount = upstreamMediaList.filter((m) => !isWatched(m.id)).length;
                          return unwatchedCount > 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                for (const item of upstreamMediaList) {
                                  if (!isWatched(item.id)) {
                                    toggleWatched(item.id);
                                  }
                                }
                                showToast(`✓ Marked ${unwatchedCount} as watched`);
                                setPanelMode("normal");
                              }}
                              className="mt-4 flex items-center justify-center rounded-xl border border-emerald-700 bg-emerald-900/30 px-4 py-2.5 text-sm font-medium text-emerald-300 transition hover:bg-emerald-900/50"
                            >
                              Mark {unwatchedCount} as watched
                            </button>
                          ) : (
                            <p className="mt-4 text-center text-xs text-zinc-500">All already watched</p>
                          );
                        })()}
                      </>
                    ) : (
                      <>
                        <h2 className="text-base font-bold leading-tight text-white">{panelMedia.title}</h2>
                        <p className="mt-1 text-xs text-zinc-400">{formatDateLabel(panelMedia.release_date)}</p>
                        <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-zinc-300">{panelMedia.summary}</p>

                        <div className="mt-4 flex flex-wrap gap-1.5">
                          <p className="w-full text-[10px] font-semibold uppercase tracking-widest text-zinc-500">Upstream types</p>
                          {(["required", "optional", "references"] as ConnectionType[]).map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => toggleUpstreamType(type)}
                              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition ${upstreamTypes.has(type) ? "border-transparent text-white" : "border-zinc-700 text-zinc-500"}`}
                              style={upstreamTypes.has(type) ? { backgroundColor: edgeStyles[type].color + "33", borderColor: edgeStyles[type].color, color: edgeStyles[type].color } : undefined}
                            >
                              {edgeStyles[type].label}
                            </button>
                          ))}
                        </div>

                        <div className="mt-5 flex flex-col gap-2">
                          <Link
                            href={`/media/${panelMedia.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800"
                          >
                            View full page ↗
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleHighlight(panelMedia.id)}
                            className="flex items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
                          >
                            Highlight connections
                          </button>
                          <button
                            type="button"
                            onClick={() => handleHighlightUpstream(panelMedia.id)}
                            className="flex items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
                          >
                            Highlight up to this point
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const wasWatched = isWatched(panelMedia.id);
                              toggleWatched(panelMedia.id);
                              showToast(wasWatched ? "Removed from watched" : "✓ Marked as watched");
                            }}
                            className={`flex items-center justify-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${isWatched(panelMedia.id) ? "border-emerald-700 bg-emerald-900/30 text-emerald-300 hover:bg-emerald-900/50" : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white"}`}
                          >
                            {isWatched(panelMedia.id) ? "✓ Watched" : "Mark as watched"}
                          </button>
                          <button
                            type="button"
                            onClick={() => setPanelMode("mark-upstream")}
                            className="flex items-center justify-center rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
                          >
                            Mark up to this point
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </aside>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
