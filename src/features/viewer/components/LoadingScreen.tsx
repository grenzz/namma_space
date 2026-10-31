import { useEffect, useRef } from "react";
import "./LoadingScreen.css";

type Vec3 = [number, number, number];
type Axis = 0 | 1 | 2;

type CloudPoint = {
  x: number;
  y: number;
  z: number;
  glow: number;
  phase: number;
  size: number;
};

type Segment = [Vec3, Vec3];
type Ripple = { x: number; y: number; t0: number };

interface LoadingScreenProps {
  /** Pass actual loading progress from 0 to 100. Leave undefined for indeterminate progress. */
  progress?: number;
  /** A real status from your loader, e.g. "Preparing the 3D scene". */
  status?: string;
  /** Optional name of the space or model being loaded. */
  name?: string;
  /** Pass an error message when loading fails; null while loading normally. */
  error: string | null;
  /** Keep mounted briefly after the viewer is ready to fade out smoothly. */
  done?: boolean;
  /** Optional retry action shown in the error state. */
  onRetry?: () => void;
}

/* ------------------------------------------------------------------ */
/* Tunables                                                            */
/* ------------------------------------------------------------------ */
const TAU = Math.PI * 2;
const CAMERA_Z = 1.55; // depth offset used by the projection
const FOCUS_DEPTH = 7.3; // depth that stays still while the camera sways (the sofa)
const CAM_RANGE_X = 0.45; // how far the camera slides sideways with the cursor
const CAM_RANGE_Y = 0.18; // ...and vertically
const ALPHA_BUCKETS = 12; // points are batched into this many opacity levels
const ALPHA_MAX = 0.95;
const SPOT_RADIUS = 170; // cursor "flashlight" radius in CSS px
const RIPPLE_SPEED = 0.55; // px per ms
const RIPPLE_LIFE = 1500; // ms
const RIPPLE_BAND = 60; // thickness of the shockwave in px
const MAX_RIPPLES = 6;
const TEXT_DIM_FLOOR = 0.3; // how much the cloud is dimmed behind the text (1 = no dimming)
const TIME_FLOOR_MAX = 0.7; // the room always forms at least this far on its own clock
const TIME_FLOOR_MS = 2500; // ...over this many milliseconds

function createRandom(seed = 7419) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function addSurface(
  points: CloudPoint[],
  count: number,
  fixedAxis: Axis,
  fixedValue: number,
  aAxis: Axis,
  aMin: number,
  aMax: number,
  bAxis: Axis,
  bMin: number,
  bMax: number,
  random: () => number,
  exclude?: (point: Vec3) => boolean,
) {
  let added = 0;
  let attempts = 0;

  while (added < count && attempts < count * 5) {
    attempts += 1;
    const point: Vec3 = [0, 0, 0];
    point[fixedAxis] = fixedValue;
    point[aAxis] = aMin + random() * (aMax - aMin);
    point[bAxis] = bMin + random() * (bMax - bMin);

    if (exclude?.(point)) continue;

    points.push({
      x: point[0],
      y: point[1],
      z: point[2],
      glow: 0.35 + random() * 0.65,
      phase: random() * Math.PI * 2,
      size: 0.45 + random() * 0.8,
    });
    added += 1;
  }
}

function addBoxCloud(
  points: CloudPoint[],
  min: Vec3,
  max: Vec3,
  count: number,
  random: () => number,
) {
  for (let i = 0; i < count; i += 1) {
    const point: Vec3 = [
      min[0] + random() * (max[0] - min[0]),
      min[1] + random() * (max[1] - min[1]),
      min[2] + random() * (max[2] - min[2]),
    ];
    const face = Math.floor(random() * 6);
    const axis = Math.floor(face / 2) as Axis;
    point[axis] = face % 2 === 0 ? min[axis] : max[axis];

    points.push({
      x: point[0],
      y: point[1],
      z: point[2],
      glow: 0.4 + random() * 0.6,
      phase: random() * Math.PI * 2,
      size: 0.5 + random() * 0.75,
    });
  }
}

function addBoxEdges(lines: Segment[], min: Vec3, max: Vec3) {
  const c: Vec3[] = [
    [min[0], min[1], min[2]],
    [max[0], min[1], min[2]],
    [max[0], max[1], min[2]],
    [min[0], max[1], min[2]],
    [min[0], min[1], max[2]],
    [max[0], min[1], max[2]],
    [max[0], max[1], max[2]],
    [min[0], max[1], max[2]],
  ];
  const pairs: Array<[number, number]> = [
    [0, 1], [1, 2], [2, 3], [3, 0],
    [4, 5], [5, 6], [6, 7], [7, 4],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ];
  pairs.forEach(([a, b]) => lines.push([c[a], c[b]]));
}

function buildScene() {
  const points: CloudPoint[] = [];
  const lines: Segment[] = [];
  const random = createRandom();

  // Room surfaces. Counts are higher than before because the cloud now fills the whole screen.
  // The central back-wall opening gives the scene a window-like feature.
  addSurface(points, 2900, 2, 9.5, 0, -4, 4, 1, 0, 3.4, random, (p) =>
    p[0] > -1.6 && p[0] < 1.6 && p[1] > 1.15 && p[1] < 2.95,
  );
  addSurface(points, 2200, 0, -4, 2, 1.35, 9.5, 1, 0, 3.4, random);
  addSurface(points, 2200, 0, 4, 2, 1.35, 9.5, 1, 0, 3.4, random);
  addSurface(points, 3000, 1, 0.04, 0, -4, 4, 2, 1.35, 9.5, random);
  addSurface(points, 1000, 1, 3.4, 0, -4, 4, 2, 1.35, 9.5, random);

  // Furniture silhouettes: couch, cushions, side cabinets and a low table.
  addBoxCloud(points, [-1.75, 0.2, 5.25], [1.75, 0.82, 6.05], 620, random);
  addBoxCloud(points, [-1.62, 0.78, 5.75], [1.62, 1.72, 6.12], 520, random);
  addBoxCloud(points, [-1.95, 0.48, 5.25], [-1.62, 1.18, 6.12], 180, random);
  addBoxCloud(points, [1.62, 0.48, 5.25], [1.95, 1.18, 6.12], 180, random);
  addBoxCloud(points, [-1.1, 0.82, 5.45], [-0.08, 1.18, 5.8], 120, random);
  addBoxCloud(points, [0.08, 0.82, 5.45], [1.1, 1.18, 5.8], 120, random);
  addBoxCloud(points, [-1.05, 0.18, 3.9], [1.05, 0.48, 4.35], 260, random);
  addBoxCloud(points, [-3.25, 0.15, 6.0], [-2.35, 1.05, 6.8], 280, random);
  addBoxCloud(points, [2.4, 0.15, 6.25], [3.15, 1.3, 7.0], 260, random);

  // Architectural edges, window frames and furniture outlines.
  const roomCorners: Vec3[] = [
    [-4, 0.04, 1.35], [4, 0.04, 1.35], [-4, 3.4, 1.35], [4, 3.4, 1.35],
    [-4, 0.04, 9.5], [4, 0.04, 9.5], [-4, 3.4, 9.5], [4, 3.4, 9.5],
  ];
  [[0, 1], [0, 2], [1, 3], [2, 3], [4, 5], [4, 6], [5, 7], [6, 7], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(([a, b]) => {
    lines.push([roomCorners[a], roomCorners[b]]);
  });

  const addWindow = (left: number, right: number) => {
    const z = 9.47;
    const bottom = 1.18;
    const top = 2.94;
    lines.push(
      [[left, bottom, z], [right, bottom, z]],
      [[right, bottom, z], [right, top, z]],
      [[right, top, z], [left, top, z]],
      [[left, top, z], [left, bottom, z]],
    );
  };
  addWindow(-1.55, -0.55);
  addWindow(-0.48, 0.48);
  addWindow(0.55, 1.55);
  lines.push([[-0.52, 1.18, 9.47], [-0.52, 2.94, 9.47]], [[0.52, 1.18, 9.47], [0.52, 2.94, 9.47]]);

  addBoxEdges(lines, [-1.75, 0.2, 5.25], [1.75, 0.82, 6.05]);
  addBoxEdges(lines, [-1.62, 0.78, 5.75], [1.62, 1.72, 6.12]);
  addBoxEdges(lines, [-1.05, 0.18, 3.9], [1.05, 0.48, 4.35]);
  addBoxEdges(lines, [-3.25, 0.15, 6.0], [-2.35, 1.05, 6.8]);
  addBoxEdges(lines, [2.4, 0.15, 6.25], [3.15, 1.3, 7.0]);

  return { points, lines };
}

/** Shortest distance from point (px, py) to the segment (x1, y1)-(x2, y2). */
function distanceToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const vx = x2 - x1;
  const vy = y2 - y1;
  const lengthSq = vx * vx + vy * vy;
  let t = lengthSq === 0 ? 0 : ((px - x1) * vx + (py - y1) * vy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * vx), py - (y1 + t * vy));
}

export default function LoadingScreen({
  progress,
  status,
  name,
  error,
  done = false,
  onRetry,
}: LoadingScreenProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const copyRef = useRef<HTMLElement>(null);
  const meterRef = useRef<HTMLElement>(null);
  const hintRef = useRef<HTMLParagraphElement>(null);
  const progressRef = useRef<number | null>(null);
  const renderRef = useRef<((time: number) => void) | null>(null);
  const reducedMotionRef = useRef(false);

  const hasProgress = typeof progress === "number" && Number.isFinite(progress);
  const percent = hasProgress ? Math.max(0, Math.min(100, Math.round(progress))) : null;
  const progressStatus = status ?? (hasProgress ? "DOWNLOADING MODEL" : "INITIALIZING SPATIAL ENGINE");

  useEffect(() => {
    progressRef.current = percent === null ? null : percent / 100;
    if (reducedMotionRef.current) renderRef.current?.(performance.now());
  }, [percent]);

  useEffect(() => {
    if (error) {
      renderRef.current = null;
      return;
    }

    const canvas = canvasRef.current;
    const root = rootRef.current;
    const ctx = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !root || !ctx) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = motionQuery.matches;
    const coarsePointer = window.matchMedia("(pointer: coarse)").matches;

    const { points, lines } = buildScene();

    let width = 0;
    let height = 0;
    let focal = 0;
    let frameId = 0;
    let shown = 0;
    let lastTime = 0;
    let lastMeasure = -Infinity;
    const startedAt = performance.now();

    // Camera sway, eased toward its target every frame.
    const cam = { x: 0, y: 0 };
    const camTarget = { x: 0, y: 0 };

    // Cursor state. x/y are raw, sx/sy trail slightly so the light feels soft.
    const pointer = { x: 0, y: 0, sx: 0, sy: 0, spot: 0, active: false };
    const ripples: Ripple[] = [];

    // Area covered by the headline and progress bar; the cloud dims there to keep text readable.
    const zone = { cx: 0, cy: 0, rx: 1, ry: 1, valid: false };

    // Reused projection result to avoid allocating thousands of arrays per frame.
    const proj = { x: 0, y: 0, d: 1 };

    let interacted = false;
    let hintShowTimer = 0;
    let hintHideTimer = 0;

    const setHint = (visible: boolean) => {
      if (hintRef.current) hintRef.current.style.opacity = visible ? "1" : "0";
    };

    const markInteracted = () => {
      if (interacted) return;
      interacted = true;
      window.clearTimeout(hintShowTimer);
      window.clearTimeout(hintHideTimer);
      setHint(false);
    };

    const measureZone = () => {
      const canvasRect = canvas.getBoundingClientRect();
      const rects = [copyRef.current, meterRef.current]
        .filter((el): el is HTMLElement => el !== null)
        .map((el) => el.getBoundingClientRect());
      if (rects.length === 0) {
        zone.valid = false;
        return;
      }
      const left = Math.min(...rects.map((r) => r.left)) - canvasRect.left;
      const right = Math.max(...rects.map((r) => r.right)) - canvasRect.left;
      const top = Math.min(...rects.map((r) => r.top)) - canvasRect.top;
      const bottom = Math.max(...rects.map((r) => r.bottom)) - canvasRect.top;
      zone.cx = (left + right) / 2;
      zone.cy = (top + bottom) / 2;
      zone.rx = ((right - left) / 2) * 1.15 + 80;
      zone.ry = ((bottom - top) / 2) * 1.15 + 50;
      zone.valid = true;
    };

    /** 1 outside the text area, easing down to `floor` right behind the text. */
    const dimAt = (x: number, y: number, floor: number) => {
      if (!zone.valid) return 1;
      const nx = (x - zone.cx) / zone.rx;
      const ny = (y - zone.cy) / zone.ry;
      const d = Math.sqrt(nx * nx + ny * ny);
      if (d >= 1.6) return 1;
      const t = d <= 0.7 ? 0 : (d - 0.7) / 0.9;
      const s = t * t * (3 - 2 * t);
      return floor + (1 - floor) * s;
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      // Wide enough that the side walls bleed off the screen edges, but not so wide it crops the room on phones.
      focal = Math.min(Math.max(width * 0.9, height * 1.3), width * 1.6);
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      measureZone();
    };

    // Perspective projection with a camera that orbits around FOCUS_DEPTH, so the sofa stays
    // put while nearer and farther surfaces slide past it (real parallax).
    const project = (px: number, py: number, pz: number) => {
      const depth = pz + CAMERA_Z;
      const scale = focal / depth;
      proj.x = width / 2 + (px - cam.x) * scale + (cam.x * focal) / FOCUS_DEPTH;
      proj.y = height * 0.49 - (py - 1.55 - cam.y) * scale - (cam.y * focal) / FOCUS_DEPTH;
      proj.d = depth;
    };

    const render = (time: number) => {
      const reduced = reducedMotionRef.current;
      const dt = lastTime ? Math.min(64, time - lastTime) : 16;
      lastTime = time;

      if (time - lastMeasure > 600) {
        lastMeasure = time;
        measureZone();
      }

      // Reveal progress. The room forms on its own clock so the screen is never empty,
      // and the real download progress takes over once it is ahead of that clock.
      const elapsed = time - startedAt;
      const timeFloor = Math.min(TIME_FLOOR_MAX, elapsed / TIME_FLOOR_MS);
      const real = progressRef.current;
      const target = real === null ? 1 : Math.max(timeFloor, real);
      if (reduced) {
        shown = 1;
      } else {
        shown += (target - shown) * (1 - Math.exp(-dt / 260));
      }
      const lineFade = Math.min(1, shown * 1.4);

      // Camera sway: cursor-driven plus a slow idle drift so the scene is never frozen.
      if (reduced) {
        cam.x = 0;
        cam.y = 0;
        pointer.spot = 0;
      } else {
        const driftX = Math.sin(time * 0.00031) * 0.14;
        const driftY = Math.sin(time * 0.00023 + 1.3) * 0.05;
        const camEase = 1 - Math.exp(-dt / 170);
        cam.x += (camTarget.x * CAM_RANGE_X + driftX - cam.x) * camEase;
        cam.y += (camTarget.y * CAM_RANGE_Y + driftY - cam.y) * camEase;
        pointer.spot += ((pointer.active ? 1 : 0) - pointer.spot) * (1 - Math.exp(-dt / 140));
        const followEase = 1 - Math.exp(-dt / 55);
        pointer.sx += (pointer.x - pointer.sx) * followEase;
        pointer.sy += (pointer.y - pointer.sy) * followEase;
      }

      // Drop finished ripples and precompute the live ones.
      for (let i = ripples.length - 1; i >= 0; i -= 1) {
        if (time - ripples[i].t0 > RIPPLE_LIFE) ripples.splice(i, 1);
      }
      const liveRipples = reduced
        ? []
        : ripples.map((r) => {
            const age = time - r.t0;
            return { x: r.x, y: r.y, radius: age * RIPPLE_SPEED, life: 1 - age / RIPPLE_LIFE };
          });

      const spotActive = pointer.spot > 0.01;
      const spotRadiusSq = SPOT_RADIUS * SPOT_RADIUS;

      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";

      // Soft light that follows the cursor.
      if (spotActive) {
        const reach = SPOT_RADIUS * 1.6;
        const glow = ctx.createRadialGradient(pointer.sx, pointer.sy, 0, pointer.sx, pointer.sy, reach);
        glow.addColorStop(0, `rgba(92, 230, 220, ${0.12 * pointer.spot})`);
        glow.addColorStop(1, "rgba(92, 230, 220, 0)");
        ctx.fillStyle = glow;
        ctx.fillRect(pointer.sx - reach, pointer.sy - reach, reach * 2, reach * 2);
      }

      // Points are batched into opacity buckets (normal + "hot" near the cursor) so we issue
      // ~24 fills per frame instead of one per point.
      const buckets = ALPHA_BUCKETS;
      const paths: Path2D[] = [];
      const used: boolean[] = [];
      for (let i = 0; i < buckets * 2; i += 1) {
        paths.push(new Path2D());
        used.push(false);
      }

      const pointStride = width >= 1200 ? 1 : width >= 650 ? 2 : 3;
      let pointIndex = 0;
      for (const point of points) {
        if (pointIndex++ % pointStride !== 0) continue;

        const reveal = ((point.z - 1.35) / 8.15) * 0.85 + (point.phase / TAU) * 0.15;
        const k = Math.min(1, Math.max(0, (shown - reveal) * 12));
        if (k === 0) continue;

        project(point.x, point.y, point.z);
        const x = proj.x;
        const y = proj.y;
        const depth = proj.d;
        if (x < -40 || x > width + 40 || y < -40 || y > height + 40) continue;

        let offsetX = 0;
        let offsetY = 0;
        let boost = 0;

        // Cursor lens: nearby points swell, brighten and are nudged away.
        if (spotActive) {
          const dx = x - pointer.sx;
          const dy = y - pointer.sy;
          const d2 = dx * dx + dy * dy;
          if (d2 < spotRadiusSq) {
            const d = Math.sqrt(d2) || 1;
            const f = (1 - d / SPOT_RADIUS) ** 2 * pointer.spot;
            offsetX += (dx / d) * f * 26;
            offsetY += (dy / d) * f * 26;
            boost += f * 1.6;
          }
        }

        // Click / tap shockwaves.
        for (const rp of liveRipples) {
          const dx = x - rp.x;
          const dy = y - rp.y;
          const d = Math.sqrt(dx * dx + dy * dy) || 1;
          const band = Math.abs(d - rp.radius);
          if (band < RIPPLE_BAND) {
            const f = (1 - band / RIPPLE_BAND) ** 2 * rp.life;
            offsetX += (dx / d) * f * 34;
            offsetY += (dy / d) * f * 34;
            boost += f * 2.4;
          }
        }

        const shimmer = reduced
          ? 0.82
          : 0.62 + 0.38 * (0.5 + 0.5 * Math.sin(time * 0.0015 + point.phase));
        const depthFade = Math.max(0.18, 1 - (depth - 2) / 18);
        const alpha = Math.min(
          ALPHA_MAX,
          point.glow * shimmer * depthFade * k * dimAt(x, y, TEXT_DIM_FLOOR) * (1 + boost),
        );
        if (alpha < 0.02) continue;

        const radius = point.size * (0.65 + 1.7 / depth) * (1 + Math.min(boost, 1.5) * 0.35);
        const bucket = Math.min(buckets - 1, Math.floor((alpha / ALPHA_MAX) * buckets)) + (boost > 0.6 ? buckets : 0);
        const px = x + offsetX;
        const py = y + offsetY;
        paths[bucket].moveTo(px + radius, py);
        paths[bucket].arc(px, py, radius, 0, TAU);
        used[bucket] = true;
      }

      for (let i = 0; i < buckets * 2; i += 1) {
        if (!used[i]) continue;
        const bucketAlpha = (((i % buckets) + 0.5) / buckets) * ALPHA_MAX;
        ctx.fillStyle =
          i >= buckets
            ? `rgba(175, 255, 248, ${bucketAlpha})`
            : `rgba(92, 230, 220, ${bucketAlpha})`;
        ctx.fill(paths[i]);
      }

      // Room outlines. They stay subtle, but light up when the cursor passes close to them.
      ctx.lineWidth = 0.75;
      for (const [start, end] of lines) {
        project(start[0], start[1], start[2]);
        const x1 = proj.x;
        const y1 = proj.y;
        project(end[0], end[1], end[2]);
        const x2 = proj.x;
        const y2 = proj.y;

        let boost = 0;
        if (spotActive) {
          const d = distanceToSegment(pointer.sx, pointer.sy, x1, y1, x2, y2);
          const reach = SPOT_RADIUS * 1.8;
          if (d < reach) boost = (1 - d / reach) ** 2 * pointer.spot;
        }

        const dim = dimAt((x1 + x2) / 2, (y1 + y2) / 2, 0.5);
        const alpha = Math.min(0.85, 0.38 * lineFade * dim * (1 + boost * 2.2));
        ctx.strokeStyle = `rgba(93, 230, 222, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // Visible ring for each shockwave.
      ctx.lineWidth = 1.25;
      for (const rp of liveRipples) {
        ctx.strokeStyle = `rgba(130, 248, 238, ${0.4 * rp.life * rp.life})`;
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, Math.max(0, rp.radius), 0, TAU);
        ctx.stroke();
      }

      if (!reduced) {
        const scanY = ((time * 0.035) % (height + 50)) - 25;
        const scan = ctx.createLinearGradient(0, scanY - 18, 0, scanY + 18);
        scan.addColorStop(0, "rgba(92, 230, 220, 0)");
        scan.addColorStop(0.5, "rgba(92, 230, 220, 0.09)");
        scan.addColorStop(1, "rgba(92, 230, 220, 0)");
        ctx.fillStyle = scan;
        ctx.fillRect(0, scanY - 18, width, 36);
      }

      ctx.restore();
      frameId = reduced ? 0 : window.requestAnimationFrame(render);
    };

    const toLocal = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      return {
        x,
        y,
        nx: (x / Math.max(1, rect.width)) * 2 - 1,
        ny: (y / Math.max(1, rect.height)) * 2 - 1,
      };
    };

    const onPointerMove = (event: PointerEvent) => {
      if (reducedMotionRef.current) return;
      const p = toLocal(event);
      if (!pointer.active && pointer.spot < 0.05) {
        pointer.sx = p.x;
        pointer.sy = p.y;
      }
      pointer.x = p.x;
      pointer.y = p.y;
      pointer.active = true;
      camTarget.x = p.nx;
      camTarget.y = -p.ny; // cursor up = camera up
      markInteracted();
    };

    const releasePointer = () => {
      pointer.active = false;
      camTarget.x = 0;
      camTarget.y = 0;
    };

    const onPointerDown = (event: PointerEvent) => {
      if (reducedMotionRef.current) return;
      const p = toLocal(event);
      pointer.x = p.x;
      pointer.y = p.y;
      if (!pointer.active) {
        pointer.sx = p.x;
        pointer.sy = p.y;
      }
      pointer.active = true;
      ripples.push({ x: p.x, y: p.y, t0: performance.now() });
      if (ripples.length > MAX_RIPPLES) ripples.shift();
      markInteracted();
    };

    // Touch has no hover, so let go of the light when the finger lifts. A mouse keeps it.
    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") releasePointer();
    };

    const onMotionChange = (event: MediaQueryListEvent) => {
      reducedMotionRef.current = event.matches;
      if (event.matches) {
        if (frameId) window.cancelAnimationFrame(frameId);
        frameId = 0;
        ripples.length = 0;
        releasePointer();
        setHint(false);
        render(performance.now());
      } else if (!frameId) {
        frameId = window.requestAnimationFrame(render);
      }
    };

    // Discoverability: a quiet hint that appears if nobody has interacted yet, then goes away.
    const hint = hintRef.current;
    if (hint) {
      hint.textContent = coarsePointer
        ? "Touch and drag to explore. Tap to send a pulse."
        : "Move your cursor to explore. Click to send a pulse.";
      hint.style.opacity = "0";
      if (!reducedMotionRef.current) {
        hintShowTimer = window.setTimeout(() => {
          if (!interacted) setHint(true);
        }, 1400);
        hintHideTimer = window.setTimeout(() => setHint(false), 9000);
      }
    }

    resize();
    const observer = new ResizeObserver(() => {
      resize();
      if (reducedMotionRef.current) render(performance.now());
    });
    observer.observe(canvas);

    root.addEventListener("pointermove", onPointerMove, { passive: true });
    root.addEventListener("pointerdown", onPointerDown, { passive: true });
    root.addEventListener("pointerup", onPointerUp, { passive: true });
    root.addEventListener("pointercancel", onPointerUp, { passive: true });
    root.addEventListener("pointerleave", releasePointer, { passive: true });
    motionQuery.addEventListener("change", onMotionChange);

    renderRef.current = render;
    render(performance.now());

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(hintShowTimer);
      window.clearTimeout(hintHideTimer);
      observer.disconnect();
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerdown", onPointerDown);
      root.removeEventListener("pointerup", onPointerUp);
      root.removeEventListener("pointercancel", onPointerUp);
      root.removeEventListener("pointerleave", releasePointer);
      motionQuery.removeEventListener("change", onMotionChange);
      if (renderRef.current === render) renderRef.current = null;
    };
  }, [error]);

  return (
    <div
      ref={rootRef}
      className={`ns-loading-screen${done ? " is-done" : ""}`}
      style={{ isolation: "isolate", touchAction: "none" }}
      aria-hidden={done || undefined}
      aria-busy={!done && !error}
    >
      {!error && (
        <>
          {/* Full-bleed point cloud, behind the copy. Needs the root to be positioned (fixed/absolute). */}
          <canvas
            ref={canvasRef}
            aria-hidden="true"
            style={{ position: "absolute", inset: 0, zIndex: -1, display: "block", width: "100%", height: "100%" }}
          />
          {/* Edge vignette so the cloud fades out toward the corners instead of ending abruptly. */}
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: 0,
              zIndex: -1,
              pointerEvents: "none",
              background:
                "radial-gradient(ellipse at 50% 48%, rgba(5, 11, 13, 0) 42%, rgba(5, 11, 13, 0.8) 100%)",
            }}
          />
          <p
            ref={hintRef}
            aria-hidden="true"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: "max(24px, env(safe-area-inset-bottom))",
              zIndex: 2,
              margin: 0,
              textAlign: "center",
              fontSize: 12,
              letterSpacing: "0.04em",
              color: "rgba(190, 235, 232, 0.72)",
              opacity: 0,
              transition: "opacity 0.6s ease",
              pointerEvents: "none",
            }}
          />
        </>
      )}

      <main className={`ns-loader-main${error ? " has-error" : ""}`}>
        {error ? (
          <section className="ns-loader-error" role="alert">
            <div className="ns-error-symbol" aria-hidden="true">!</div>
            <div className="ns-loader-kicker"><span aria-hidden="true" />{name?.trim() || "YOUR DIGITAL TWIN"}</div>
            <h1>We couldn't prepare your space.</h1>
            <p>{error}</p>
            {onRetry && (
              <button className="ns-retry" type="button" onClick={onRetry}>
                Try again
              </button>
            )}
          </section>
        ) : (
          <>
            <section className="ns-loader-copy" ref={copyRef}>
              <h1>{name} <span>taking shape.</span></h1>
              <p>Preparing {name} for 3D exploration.</p>
            </section>

            <section className="ns-loader-progress" aria-label="Loading progress" ref={meterRef}>
              <div className="ns-progress-labels">
                <span aria-live="polite" aria-atomic="true">{progressStatus}</span>
                <span className="ns-progress-value">{hasProgress ? `${percent}%` : "IN PROGRESS"}</span>
              </div>
              <div
                className="ns-progress-track"
                role="progressbar"
                aria-label="3D environment loading progress"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={hasProgress ? percent ?? 0 : undefined}
              >
                <div
                  className={`ns-progress-fill${hasProgress ? "" : " is-indeterminate"}`}
                  style={hasProgress ? { width: `${percent}%` } : undefined}
                />
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}