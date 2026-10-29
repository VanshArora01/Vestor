import { useId, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useReducedMotion } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WorldMapNode {
  id: string;
  lessonId: string;
  label: string;
  type: "lesson" | "boss" | "checkpoint";
  position: { x: number; y: number }; // 0–100 percentage coords within viewBox
  state: "completed" | "current" | "available" | "locked";
  xpReward: number;
}

interface WorldMapProps {
  nodes: WorldMapNode[];
  onSelectNode: (lessonId: string) => void;
}

interface MapNodeProps {
  node: WorldMapNode;
  onSelect: () => void;
  onLockedHover?: (node: WorldMapNode, entering: boolean) => void;
  reduceMotion: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const VIEW_W = 400;
const VIEW_H = 600;

const NODE_RADIUS = 22;
const BOSS_RADIUS = 30;

const COLOR_TEAL = "#0F766E";
const COLOR_TEAL_LIGHT = "#CCFBF1";
const COLOR_GRAY = "#94A3B8";
const COLOR_GRAY_FILL = "#E2E8F0";
const COLOR_WHITE = "#FFFFFF";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Convert 0–100 percentage coords to absolute SVG coords. */
function toSVG(x: number, y: number): { cx: number; cy: number } {
  return {
    cx: (x / 100) * VIEW_W,
    cy: (y / 100) * VIEW_H,
  };
}

/**
 * Build a single smooth cubic-bezier SVG path that winds through all nodes.
 * For N nodes we create N-1 segments, each a cubic bezier with control points
 * pushed toward the midpoint for a natural snake feel.
 */
function buildPath(nodes: WorldMapNode[]): string {
  if (nodes.length < 2) return "";

  const pts = nodes.map((n) => toSVG(n.position.x, n.position.y));

  let d = `M ${pts[0].cx} ${pts[0].cy}`;

  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const midY = (prev.cy + curr.cy) / 2;
    // Control points bent horizontally to create the zigzag snake curve
    const cp1x = prev.cx;
    const cp1y = midY;
    const cp2x = curr.cx;
    const cp2y = midY;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.cx} ${curr.cy}`;
  }

  return d;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Checkmark icon rendered inside SVG */
function CheckIcon({ cx, cy }: { cx: number; cy: number }) {
  return (
    <path
      d={`M ${cx - 7} ${cy} l 5 5 l 9 -9`}
      stroke={COLOR_WHITE}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  );
}

/** Lock icon rendered inside SVG */
function LockIcon({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <rect
        x={cx - 6}
        y={cy - 2}
        width={12}
        height={9}
        rx={2}
        fill={COLOR_GRAY}
      />
      <path
        d={`M ${cx - 4} ${cy - 2} V ${cy - 5} a 4 4 0 0 1 8 0 V ${cy - 2}`}
        stroke={COLOR_GRAY}
        strokeWidth={2}
        fill="none"
        strokeLinecap="round"
      />
    </g>
  );
}

/** Lesson/book icon rendered inside SVG */
function LessonIcon({ cx, cy }: { cx: number; cy: number }) {
  return (
    <path
      d={`M ${cx - 7} ${cy - 7} h 14 v 14 h -14 z M ${cx - 4} ${cy - 4} h 8 M ${cx - 4} ${cy} h 8 M ${cx - 4} ${cy + 4} h 5`}
      stroke={COLOR_TEAL}
      strokeWidth={1.8}
      strokeLinecap="round"
      fill="none"
    />
  );
}

/** Star shape for boss nodes */
function BossStar({ cx, cy, size }: { cx: number; cy: number; size: number }) {
  const points = Array.from({ length: 5 }, (_, i) => {
    const outerAngle = (i * 72 - 90) * (Math.PI / 180);
    const innerAngle = ((i * 72 + 36) - 90) * (Math.PI / 180);
    const outer = `${cx + size * Math.cos(outerAngle)},${cy + size * Math.sin(outerAngle)}`;
    const inner = `${cx + (size * 0.45) * Math.cos(innerAngle)},${cy + (size * 0.45) * Math.sin(innerAngle)}`;
    return `${outer} ${inner}`;
  }).join(" ");
  return <polygon points={points} fill="#F59E0B" stroke="#D97706" strokeWidth={1.5} />;
}

/** Individual node rendered into SVG */
function MapNode({
  node,
  onSelect,
  onLockedHover,
  reduceMotion,
}: MapNodeProps) {
  const { cx, cy } = toSVG(node.position.x, node.position.y);
  const isBoss = node.type === "boss";
  const radius = isBoss ? BOSS_RADIUS : NODE_RADIUS;
  const isInteractive = node.state === "current" || node.state === "available";
  const isLocked = node.state === "locked";

  // XP badge position — bottom-right of node
  const badgeX = cx + radius * 0.6;
  const badgeY = cy + radius * 0.6;

  return (
    <g
      role="button"
      tabIndex={isInteractive ? 0 : -1}
      aria-label={`${node.label} — ${node.state}${isLocked ? " (locked)" : ""}`}
      style={{ cursor: isInteractive ? "pointer" : isLocked ? "not-allowed" : "default" }}
      onClick={() => isInteractive && onSelect()}
      onMouseEnter={() => isLocked && onLockedHover?.(node, true)}
      onMouseLeave={() => isLocked && onLockedHover?.(node, false)}
      onKeyDown={(e) => {
        if (isInteractive && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {/* ── Completed node ───────────────────────────────────────── */}
      {node.state === "completed" && !isBoss && (
        <>
          <circle cx={cx} cy={cy} r={radius} fill={COLOR_TEAL} />
          <CheckIcon cx={cx} cy={cy} />
        </>
      )}

      {/* ── Current node — pulsing ring (foreignObject hack-free: use SVG animate) */}
      {node.state === "current" && !isBoss && (
        <>
          <circle cx={cx} cy={cy} r={radius + 8} fill="none" stroke={COLOR_TEAL} strokeWidth={3} opacity={0.3}>
            {!reduceMotion && <><animate attributeName="r" values={`${radius + 4};${radius + 12};${radius + 4}`} dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.3;0.12;0.3" dur="2.4s" repeatCount="indefinite" /></>}
          </circle>
          <circle cx={cx} cy={cy} r={radius} fill={COLOR_WHITE} stroke={COLOR_TEAL} strokeWidth={3} />
          <LessonIcon cx={cx} cy={cy} />
        </>
      )}

      {/* ── Available node ────────────────────────────────────────── */}
      {node.state === "available" && !isBoss && (
        <>
          <circle cx={cx} cy={cy} r={radius} fill={COLOR_WHITE} stroke={COLOR_TEAL} strokeWidth={2} />
          <LessonIcon cx={cx} cy={cy} />
        </>
      )}

      {/* ── Locked node ───────────────────────────────────────────── */}
      {node.state === "locked" && !isBoss && (
        <>
          <circle cx={cx} cy={cy} r={radius} fill={COLOR_GRAY_FILL} stroke={COLOR_GRAY} strokeWidth={2} />
          <LockIcon cx={cx} cy={cy} />
          <title>Complete previous lessons to unlock</title>
        </>
      )}

      {/* ── Boss node ─────────────────────────────────────────────── */}
      {isBoss && (
        <>
          {node.state === "locked" && (
            <circle cx={cx} cy={cy} r={radius + 4} fill={COLOR_GRAY_FILL} stroke={COLOR_GRAY} strokeWidth={2} />
          )}
          {node.state !== "locked" && (
            <circle cx={cx} cy={cy} r={radius + 4} fill={COLOR_TEAL_LIGHT} stroke={COLOR_TEAL} strokeWidth={2} />
          )}
          <BossStar cx={cx} cy={cy} size={radius * 0.75} />
          {node.state === "locked" && <title>Complete previous lessons to unlock</title>}
        </>
      )}

      {/* ── Node label ───────────────────────────────────────────── */}
      <text
        x={cx}
        y={cy + radius + 14}
        textAnchor="middle"
        fontSize={10}
        fontFamily="DM Sans, sans-serif"
        fill={isLocked ? COLOR_GRAY : "#1E293B"}
        fontWeight={node.state === "current" ? 700 : 400}
      >
        {node.label}
      </text>

      {/* ── XP badge ─────────────────────────────────────────────── */}
      {!isLocked && (
        <g>
          <rect
            x={badgeX - 14}
            y={badgeY - 8}
            width={28}
            height={14}
            rx={7}
            fill={node.state === "completed" ? COLOR_TEAL : COLOR_TEAL_LIGHT}
          />
          <text
            x={badgeX}
            y={badgeY + 4}
            textAnchor="middle"
            fontSize={8}
            fontFamily="DM Sans, sans-serif"
            fontWeight={700}
            fill={node.state === "completed" ? COLOR_WHITE : COLOR_TEAL}
          >
            +{node.xpReward} XP
          </text>
        </g>
      )}
    </g>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function WorldMap({ nodes, onSelectNode }: WorldMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const mapId = useId().replace(/:/g, "");
  const reduceMotion = useReducedMotion() ?? false;
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string } | null>(null);

  const handleLockedHover = (node: WorldMapNode, entering: boolean) => {
    if (!entering) { setTooltip(null); return; }
    const { cx, cy } = toSVG(node.position.x, node.position.y);
    setTooltip({ x: cx, y: cy - NODE_RADIUS - 16, label: "Complete previous lessons to unlock" });
  };

  const fullPath = buildPath(nodes);

  // Split path into "completed" portion (up to last completed node) and "ahead" portion.
  // Rather than slicing the path string (complex), we overlay two identical paths with
  // different strokeDashoffset. We use a simpler approach: draw the full path twice.
  const lastCompletedIndex = nodes.reduce(
    (acc, n, i) => (n.state === "completed" ? i : acc),
    -1
  );
  const currentIndex = nodes.findIndex((n) => n.state === "current");
  const progressIndex = currentIndex !== -1 ? currentIndex : lastCompletedIndex;

  return (
    <motion.div className="w-full" initial={reduceMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: reduceMotion ? 0 : 0.2 }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-auto"
        aria-label="Lesson world map"
        role="group"
      >
        {/* ── Defs ─────────────────────────────────────────────── */}
        <defs>
          {/* Clip path to show only the completed portion of the path */}
          {nodes.length > 0 && progressIndex >= 0 && (
            <clipPath id={`${mapId}-completed-clip`}>
              <rect
                x={0}
                y={0}
                width={VIEW_W}
                height={
                  progressIndex < nodes.length - 1
                    ? toSVG(nodes[progressIndex].position.x, nodes[progressIndex].position.y).cy + 1
                    : VIEW_H
                }
              />
            </clipPath>
          )}
        </defs>

        {/* ── Background ───────────────────────────────────────── */}
        <rect width={VIEW_W} height={VIEW_H} fill="#F8FAFC" rx={16} />

        {/* ── Road path — full dashed (ahead / locked) ─────────── */}
        {fullPath && (
          <path
            d={fullPath}
            fill="none"
            stroke={COLOR_GRAY_FILL}
            strokeWidth={10}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {fullPath && (
          <path
            d={fullPath}
            fill="none"
            stroke={COLOR_GRAY}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="6 8"
          />
        )}

        {/* ── Road path — solid teal (completed progress) ───────── */}
        {fullPath && progressIndex >= 0 && (
          <path
            d={fullPath}
            fill="none"
            stroke={COLOR_TEAL}
            strokeWidth={10}
            strokeLinecap="round"
            strokeLinejoin="round"
            clipPath={`url(#${mapId}-completed-clip)`}
          />
        )}
        {fullPath && progressIndex >= 0 && (
          <path
            d={fullPath}
            fill="none"
            stroke={COLOR_WHITE}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="4 10"
            clipPath={`url(#${mapId}-completed-clip)`}
          />
        )}

        {/* ── Nodes ─────────────────────────────────────────────── */}
        {nodes.map((node) => (
          <MapNode
            key={node.id}
            node={node}
            reduceMotion={reduceMotion}
            onSelect={() => onSelectNode(node.lessonId)}
            onLockedHover={handleLockedHover}
          />
        ))}

        {/* ── Tooltip for locked nodes (SVG title handles basic) ── */}
        {tooltip && (
          <g>
            <rect
              x={tooltip.x - 80}
              y={tooltip.y - 28}
              width={160}
              height={22}
              rx={6}
              fill="#1E293B"
              opacity={0.85}
            />
            <text
              x={tooltip.x}
              y={tooltip.y - 13}
              textAnchor="middle"
              fontSize={9}
              fontFamily="DM Sans, sans-serif"
              fill={COLOR_WHITE}
            >
              {tooltip.label}
            </text>
          </g>
        )}
      </svg>
    </motion.div>
  );
}

// ─── Preset nodes for the 50/30/20 lesson world ──────────────────────────────

export const BUDGETING_WORLD_NODES: WorldMapNode[] = [
  {
    id: "node-1",
    lessonId: "budgeting-50-30-20",
    label: "Meet Priya",
    type: "lesson",
    position: { x: 30, y: 5 },
    state: "current",
    xpReward: 10,
  },
  {
    id: "node-2",
    lessonId: "budgeting-50-30-20",
    label: "Predict Needs",
    type: "lesson",
    position: { x: 70, y: 15 },
    state: "locked",
    xpReward: 15,
  },
  {
    id: "node-3",
    lessonId: "budgeting-50-30-20",
    label: "Sort Expenses",
    type: "lesson",
    position: { x: 30, y: 28 },
    state: "locked",
    xpReward: 20,
  },
  {
    id: "node-4",
    lessonId: "budgeting-50-30-20",
    label: "Build Budget",
    type: "lesson",
    position: { x: 70, y: 40 },
    state: "locked",
    xpReward: 25,
  },
  {
    id: "node-5",
    lessonId: "budgeting-50-30-20",
    label: "Goa Dilemma",
    type: "checkpoint",
    position: { x: 30, y: 53 },
    state: "locked",
    xpReward: 20,
  },
  {
    id: "node-6",
    lessonId: "budgeting-50-30-20",
    label: "Match Terms",
    type: "lesson",
    position: { x: 70, y: 65 },
    state: "locked",
    xpReward: 15,
  },
  {
    id: "node-7",
    lessonId: "budgeting-50-30-20",
    label: "Spot Mistake",
    type: "lesson",
    position: { x: 30, y: 77 },
    state: "locked",
    xpReward: 20,
  },
  {
    id: "node-8",
    lessonId: "budgeting-50-30-20",
    label: "Budget Master",
    type: "boss",
    position: { x: 50, y: 90 },
    state: "locked",
    xpReward: 30,
  },
];

export default WorldMap;
