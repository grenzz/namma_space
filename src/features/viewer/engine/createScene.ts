import * as THREE from "three";
import { SparkRenderer } from "@sparkjsdev/spark";
import { createMovement } from "./movement";
import { createRecorder } from "./recorder";
import { createPolygonLine } from "./debugDraw";
import type { VenueConfig } from "@/features/venues/types";
import Stats from "three/examples/jsm/libs/stats.module.js";
import { useOverlayStore } from "@/features/viewer/store/overlayStore";

export interface SceneContext {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  dispose: () => void;
}

const EYE_HEIGHT = 0.8;

export function createScene(
  container: HTMLElement,
  config: VenueConfig,
): SceneContext {
  const renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const spark = new SparkRenderer({ renderer });
  scene.add(spark);

  const camera = new THREE.PerspectiveCamera(
    70,
    container.clientWidth / container.clientHeight,
    0.01,
    1000,
  );

  const movement = createMovement(camera, renderer.domElement, {
    start: config.startPosition,
    floorHeight: config.floorHeight,
    eyeHeight: EYE_HEIGHT,
    collision: {
      walkable: config.walkable,
      obstacles: config.obstacles,
      radius: config.playerRadius,
    },
  });

  // ---- Debug overlays: always created, hidden by default, toggled from the panel ----
  const grid = new THREE.GridHelper(20, 20);
  scene.add(grid);

  const stats = new Stats();
  container.appendChild(stats.dom);

  const zones = new THREE.Group();
  if (config.walkable.length >= 3) {
    zones.add(createPolygonLine(config.walkable, config.floorHeight, 0x00ff00));
  }
  for (const obstacle of config.obstacles) {
    if (obstacle.length >= 3) {
      zones.add(createPolygonLine(obstacle, config.floorHeight, 0xff0000));
    }
  }
  scene.add(zones);

  const applyOverlays = (s: {
    showGrid: boolean;
    showFps: boolean;
    showZones: boolean;
  }) => {
    grid.visible = s.showGrid;
    zones.visible = s.showZones;
    stats.dom.style.display = s.showFps ? "block" : "none";
  };
  applyOverlays(useOverlayStore.getState());
  const unsubscribeOverlays = useOverlayStore.subscribe(applyOverlays);

  // Path recorder stays dev-only.
  const stopRecorder = import.meta.env.DEV ? createRecorder(camera) : undefined;

  const onResize = () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  };
  window.addEventListener("resize", onResize);

  let last = 0;
  renderer.setAnimationLoop((time) => {
    const dt = Math.min((time - last) / 1000, 0.05);
    last = time;
    movement.update(dt);
    stats.update();
    renderer.render(scene, camera);
  });

  const dispose = () => {
    renderer.setAnimationLoop(null);
    window.removeEventListener("resize", onResize);
    unsubscribeOverlays();
    stopRecorder?.();
    movement.dispose();
    renderer.dispose();
    renderer.domElement.remove();
    stats.dom.remove();
  };

  return { scene, camera, renderer, dispose };
}