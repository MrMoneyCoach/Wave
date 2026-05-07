import { useRef, type MutableRefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, ContactShadows } from "@react-three/drei";
import type { Mesh } from "three";

type Props = {
  progressRef?: MutableRefObject<number>;
};

function PlaceholderForm({ progressRef }: Props) {
  const ref = useRef<Mesh>(null!);

  useFrame((_state, delta) => {
    const p = progressRef?.current ?? 0;
    const targetY = p * Math.PI * 2.2;
    ref.current.rotation.y += (targetY - ref.current.rotation.y) * 0.08;
    ref.current.rotation.y += delta * 0.04;

    const targetScale = 0.85 + p * 0.45;
    const cur = ref.current.scale.x;
    const next = cur + (targetScale - cur) * 0.08;
    ref.current.scale.setScalar(next);
  });

  return (
    <mesh ref={ref} castShadow>
      <boxGeometry args={[1.35, 1.55, 0.75]} />
      <meshPhysicalMaterial
        color="#E8DDD0"
        roughness={0.82}
        sheen={1}
        sheenRoughness={0.6}
        sheenColor="#F2EAD8"
        clearcoat={0.05}
      />
    </mesh>
  );
}

export default function NappyPlaceholder({ progressRef }: Props) {
  return (
    <Canvas
      camera={{ position: [0, 0.3, 3.6], fov: 28 }}
      shadows
      dpr={[1, 1.6]}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[3.5, 4, 2.5]}
        intensity={1.4}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-2.5, 1.5, -1]} intensity={0.35} color="#D4C4B5" />
      <PlaceholderForm progressRef={progressRef} />
      <ContactShadows
        position={[0, -0.88, 0]}
        opacity={0.4}
        scale={6}
        blur={2.6}
        far={2}
      />
      <Environment preset="apartment" />
    </Canvas>
  );
}
