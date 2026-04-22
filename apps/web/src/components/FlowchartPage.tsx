"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Edge,
  Handle,
  MarkerType,
  Node,
  NodeProps,
  Panel,
  Position,
  ReactFlow,
} from "@xyflow/react";
import { AppNavbar } from "./AppNavbar";
import { apiV1Path, resolvePosterUrl } from "../lib/api";
import flowchartFixedPositions from "@/lib/flowchartFixedPositions.json";
import flowchartUniverseZones from "@/lib/flowchartUniverseZones.json";

type MediaType = "movie" | "show" | "special";
type ConnectionType = "required" | "optional" | "references";

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

const EDGE_STYLES: Record<ConnectionType, { color: string; label: string }> = {
  required: { color: "#f87171", label: "Required" },
  optional: { color: "#facc15", label: "Optional" },
  references: { color: "#60a5fa", label: "Reference" },
};

const FIXED_NODE_POSITIONS = flowchartFixedPositions as Record<string, { x: number; y: number }>;
const UNIVERSE_ZONE_OVERRIDES = flowchartUniverseZones as Record<string, UniverseZoneOverride>;

const FALLBACK_UNIVERSE_COLORS = ["#ef4444", "#8b5cf6", "#06b6d4", "#f59e0b", "#22c55e", "#ec4899", "#14b8a6"];

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

function hexToRgba(hexColor: string, alpha: number) {
  const sanitized = hexColor.replace("#", "");
  const value = Number.parseInt(sanitized, 16);

  if (Number.isNaN(value) || sanitized.length !== 6) {
    return `rgba(255, 255, 255, ${alpha})`;
  }

  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function buildRoundedPolygonPath(points: Array<{ x: number; y: number }>, radius: number) {
  if (points.length < 3) {
    return "";
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
  return segments.join(" ");
}

function MediaFlowNode({ data, selected }: NodeProps<Node<MediaNodeData>>) {
  return (
    <article
      className={`group h-full w-full overflow-hidden rounded-2xl border bg-zinc-950/95 shadow-[0_16px_40px_rgba(0,0,0,0.3)] transition duration-200 ${selected ? "border-white/60" : "border-white/10"}`}
      style={{ boxShadow: `0 0 0 1px ${hexToRgba(data.universeColor, 0.38)}, 0 16px 40px rgba(0, 0, 0, 0.3)` }}
    >
      <Handle type="target" position={Position.Top} className="h-2! w-2! border-0! bg-transparent! opacity-0!" />
      <Handle type="source" position={Position.Bottom} className="h-2! w-2! border-0! bg-transparent! opacity-0!" />

      <Link href={data.href} className="flex h-full gap-3 p-3">
        <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-zinc-800">
          <Image src={resolvePosterUrl(data.poster)} alt={data.title} fill className="object-cover" sizes="80px" unoptimized />
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
      </Link>
    </article>
  );
}

function UniverseGroupNode({ data }: NodeProps<Node<UniverseGroupNodeData>>) {
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
}

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

function buildFlowElements(graph: GraphResponse, universes: UniverseMetadata[], sagas: SagaMetadata[]) {
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

  const layoutedEdges: Edge[] = graph.edges.flatMap((edge) => {
    if (edge.source === edge.target) {
      return [];
    }

    const edgeKey = `${edge.type}:${edge.target}->${edge.source}`;
    if (seenEdges.has(edgeKey)) {
      return [];
    }

    seenEdges.add(edgeKey);
    const style = EDGE_STYLES[edge.type];
    const opacity = edge.type === "required" ? 0.9 : edge.type === "optional" ? 0.62 : 0.5;
    const strokeWidth = edge.type === "required" ? 3.2 : 2.6;
    const strokeDasharray = edge.type === "references" ? "8 6" : undefined;

    return [{
      id: `${edge.type}-${edge.source}-${edge.target}`,
      source: edge.target,
      target: edge.source,
      type: "simplebezier",
      animated: false,
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const nodeTypes = useMemo(
    () => ({
      mediaNode: MediaFlowNode,
      universeGroup: UniverseGroupNode,
    }),
    [],
  );

  useEffect(() => {
    const loadGraph = async () => {
      try {
        const [graphResponse, universesResponse, sagasResponse] = await Promise.all([
          fetch(apiV1Path("/graph")),
          fetch(apiV1Path("/universes")),
          fetch(apiV1Path("/sagas")),
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

        const graphData = (await graphResponse.json()) as GraphResponse;
        const universeData = (await universesResponse.json()) as UniverseMetadata[];
        const sagaData = (await sagasResponse.json()) as SagaMetadata[];

        setGraph(graphData);
        setUniverses(universeData);
        setSagas(sagaData);
        setError(null);
      } catch (fetchError) {
        const message =
          fetchError instanceof TypeError
            ? "Impossible de joindre l’API. Vérifie que le backend tourne sur `http://localhost:8001`."
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

  const flowState = useMemo(() => {
    if (!graph) {
      return null;
    }

    return buildFlowElements(graph, universes, sagas);
  }, [graph, sagas, universes]);

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
            <div className="h-full w-full">
              <ReactFlow
                nodes={flowState.nodes}
                edges={flowState.edges}
                nodeTypes={nodeTypes}
                defaultViewport={{ x: 500, y: 200, zoom: 0.5 }}
                minZoom={0.05}
                maxZoom={1.35}
                defaultEdgeOptions={{ type: "simplebezier" }}
                proOptions={{ hideAttribution: true }}
                nodesDraggable={false}
                nodesConnectable={false}
              >
                <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(255, 255, 255, 0.08)" />
                <Controls
                  position="bottom-right"
                  showInteractive={false}
                  className="bg-white/95 shadow-xl [&_button]:border-zinc-300 [&_button]:bg-white [&_button]:text-black [&_button:hover]:bg-zinc-100 [&_button:hover]:text-black [&_button_svg]:fill-black! [&_button_svg]:stroke-black! [&_button_path]:fill-black! [&_button_path]:stroke-black!"
                />
                <Panel position="top-left">
                  <div className="max-h-[42vh] overflow-auto rounded-2xl border border-zinc-800 bg-zinc-950/90 px-3 py-2 text-xs text-zinc-200 shadow-xl backdrop-blur">
                    <p className="font-semibold uppercase tracking-[0.24em] text-zinc-400">Relations</p>
                    <div className="mt-2 space-y-1.5">
                      {Object.entries(EDGE_STYLES).map(([type, config]) => (
                        <div key={type} className="flex items-center gap-2 text-zinc-200">
                          <span
                            className="h-0.5 w-5 rounded-full"
                            style={{
                              backgroundColor: config.color,
                              opacity: type === "required" ? 0.9 : type === "optional" ? 0.62 : 0.5,
                            }}
                          />
                          <span className="truncate">{config.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Panel>
              </ReactFlow>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
