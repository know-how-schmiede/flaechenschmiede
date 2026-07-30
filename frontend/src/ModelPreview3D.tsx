import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useMemo } from "react";
import * as THREE from "three";
import { PluginEvaluation } from "./api";

type View = "perspective" | "top";

function WingHalf({ side, outline, rootChord, dihedral }: {
  side: -1 | 1; outline: number[][]; rootChord: number; dihedral: number;
}) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    outline.forEach(([chord, span], index) => {
      if (index === 0) shape.moveTo(span, chord);
      else shape.lineTo(span, chord);
    });
    shape.closePath();
    const result = new THREE.ExtrudeGeometry(shape, {
      depth: Math.max(rootChord * .035, 3), bevelEnabled: true, bevelSegments: 2,
      bevelSize: Math.max(rootChord * .008, .8), bevelThickness: Math.max(rootChord * .008, .8),
      curveSegments: 1,
    });
    result.rotateX(-Math.PI / 2);
    return result;
  }, [outline, rootChord]);
  return <mesh geometry={geometry} rotation={[0, 0, side * THREE.MathUtils.degToRad(dihedral)]} castShadow receiveShadow>
    <meshStandardMaterial color="#e96f32" roughness={.62} metalness={.05} side={THREE.DoubleSide} />
  </mesh>;
}

function Aircraft({ evaluation }: { evaluation: PluginEvaluation }) {
  const outline = evaluation.geometry.wingOutline || [];
  const ys = outline.map(point => point[1]);
  const halfSpan = Math.max(...ys.map(Math.abs));
  const rootChord = evaluation.parameters.wing.rootChordMm;
  const scale = 4 / Math.max(halfSpan * 2, rootChord, 1);
  const dihedral = evaluation.parameters.wing.dihedralDeg;
  const centerPoints = outline.filter(point => point[1] === 0);
  const leadingRoot = centerPoints.reduce((best, point) => point[0] < best[0] ? point : best);
  const trailingRoot = centerPoints.reduce((best, point) => point[0] > best[0] ? point : best);
  const halfOutline = (side: -1 | 1) => [
    leadingRoot,
    ...outline.filter(point => Math.sign(point[1]) === side).sort((a, b) => a[0] - b[0]),
    trailingRoot,
  ];
  return <group scale={scale} rotation={[0, -Math.PI / 2, 0]}>
    <WingHalf side={1} outline={halfOutline(1)} rootChord={rootChord} dihedral={dihedral} />
    <WingHalf side={-1} outline={halfOutline(-1)} rootChord={rootChord} dihedral={dihedral} />
    <mesh position={[0, 8, -rootChord * .5]} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <capsuleGeometry args={[rootChord * .075, rootChord * .72, 6, 16]} />
      <meshStandardMaterial color="#25354a" roughness={.45} />
    </mesh>
    {(evaluation.geometry.motorPositions || []).map((point, index) => {
      const side = Math.sign(point[1]) || 1;
      const height = Math.tan(THREE.MathUtils.degToRad(dihedral)) * Math.abs(point[1]);
      return <group key={index} position={[point[1], height + 14, -point[0]]}
        rotation={[0, 0, side * THREE.MathUtils.degToRad(dihedral)]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[18, 22, 34, 20]} />
          <meshStandardMaterial color="#29384b" roughness={.5} />
        </mesh>
        <mesh position={[0, 18, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[52, 52, 2, 32]} />
          <meshStandardMaterial color="#97a4b2" transparent opacity={.28} />
        </mesh>
      </group>;
    })}
  </group>;
}

export function ModelPreview3D({ evaluation, view, autoRotate }: {
  evaluation: PluginEvaluation | null; view: View; autoRotate: boolean;
}) {
  if (!evaluation?.geometry.wingOutline?.length) {
    return <div className="model-empty">Parameter berechnen, um das 3D-Modell anzuzeigen.</div>;
  }
  const cameraPosition: [number, number, number] = view === "top" ? [0, 7, .01] : [5.4, 3.8, 5.4];
  const cameraUp: [number, number, number] = view === "top" ? [0, 0, 1] : [0, 1, 0];
  return <div className="model-preview-3d" role="img" aria-label="Interaktive dreidimensionale Vorschau des Flugmodells">
    <Canvas dpr={[1, 1.75]} shadows gl={{ antialias: true, powerPreference: "high-performance" }}>
      <color attach="background" args={["#111b2b"]} />
      <fog attach="fog" args={["#111b2b", 8, 18]} />
      <PerspectiveCamera key={view} makeDefault position={cameraPosition} up={cameraUp} fov={38} />
      <ambientLight intensity={1.25} />
      <directionalLight position={[4, 7, 5]} intensity={2.4} castShadow />
      <directionalLight position={[-4, 2, -3]} intensity={.8} color="#8db9df" />
      <Suspense fallback={null}><Aircraft evaluation={evaluation} /></Suspense>
      <gridHelper args={[12, 24, "#45566c", "#253349"]} position={[0, -1.15, 0]} />
      <OrbitControls key={`${view}-${autoRotate}`} makeDefault enableDamping dampingFactor={.08}
        autoRotate={autoRotate} autoRotateSpeed={1.2} enablePan={false}
        minDistance={3.5} maxDistance={12} target={[0, 0, 0]} />
    </Canvas>
    <span className="model-preview-hint">Ziehen zum Drehen · Scrollen zum Zoomen</span>
  </div>;
}
