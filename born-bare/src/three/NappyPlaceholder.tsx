import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, ContactShadows } from "@react-three/drei";
import type { Mesh } from "three";

function PlaceholderForm() {
  const ref = useRef<Mesh>(null!);

  useFrame((_state, delta) => {
    ref.current.rotation.y += delta * 0.15;
  });

  return (
    <mesh ref={ref} castShadow>
      <boxGeometry args={[1.4, 1.6, 0.7]} />
      <meshPhysicalMaterial
        color="#E8DDD0"
        roughness={0.85}
        sheen={1}
        sheenRoughness={0.7}
        sheenColor="#F2EAD8"
      />
    </mesh>
  );
}

export default function NappyPlaceholder() {
  return (
    <Canvas
      camera={{ position: [0, 0.4, 3.4], fov: 30 }}
      shadows
      dpr={[1, 1.6]}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[3, 4, 2]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <PlaceholderForm />
      <ContactShadows
        position={[0, -0.85, 0]}
        opacity={0.35}
        scale={6}
        blur={2.4}
        far={2}
      />
      <Environment preset="apartment" />
    </Canvas>
  );
}
