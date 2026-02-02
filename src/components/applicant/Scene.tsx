/**
 * Scene Component
 * 
 * Sets up the 3D scene with proper lighting and camera for an
 * interview-style professional view of the avatar.
 */

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { Avatar } from './Avatar';
import { AVATAR_URL, getAvatarConfig } from '@/config/avatar.config';
import type { GestureState } from '@/types/avatar';

interface SceneProps {
  gestureState: GestureState;
  // Lip sync support
  visemes?: Record<string, number> | null;
  enableLipSync?: boolean;
}

export function Scene({ gestureState, visemes, enableLipSync = false }: SceneProps) {
  const orbitRef = useRef<any>(null);

  const [target, setTarget] = useState<[number, number, number]>([0, 1.5, 0]);
  const [cam, setCam] = useState<{ position: [number, number, number]; fov: number }>(() => ({
    position: [0, 1.5, 2.5], // Closer for interview framing
    fov: 35, // Tighter FOV for professional interview look
  }));

  const handleBounds = useCallback((bounds: {
    center: [number, number, number];
    size: [number, number, number];
    focus: [number, number, number];
    maxDim: number;
  }) => {
    const avatarConfig = getAvatarConfig();
    // If config explicitly sets the camera, respect it.
    if (avatarConfig.camera) {
      setTarget(bounds.focus);
      setCam({ position: avatarConfig.camera.position, fov: avatarConfig.camera.fov });
      return;
    }

    const [cx, cy, cz] = bounds.center;
    const [fx, fy, fz] = bounds.focus;

    // Interview framing: Focus on upper body/bust - chest to head
    // Tighter distance for professional interview view
    const distance = Math.max(2.0, bounds.maxDim * 2.2);
    const height = Math.max(1.2, fy);

    setTarget([fx, fy, fz]);
    setCam({ position: [cx, height, cz + distance], fov: 35 });
  }, []);

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      width: '100%',
      height: '100%',
      background: 'linear-gradient(180deg, #2d3436 0%, #4a5568 50%, #636e72 100%)'
    }}>
      <div style={{
        width: '1000px',
        height: '1000px',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          left: 12,
          top: 12,
          zIndex: 10,
          padding: '8px 10px',
          borderRadius: 10,
          background: 'rgba(0,0,0,0.35)',
          color: 'white',
          fontSize: 12,
          lineHeight: 1.2,
          userSelect: 'none'
        }}>
          Drag to rotate. Scroll to zoom. Shift+drag to pan.
        </div>
        <Canvas
          // Camera is auto-fit to the loaded model bounds (unless config overrides it)
          camera={{
            position: cam.position,
            fov: cam.fov,
            near: 0.01,
            far: 200,
          }}
          // Enable shadows for more realistic rendering
          shadows
          // Optimize performance
          dpr={[1, 2]} // Device pixel ratio (min, max)
          style={{ 
            width: '100%', 
            height: '100%',
            background: 'linear-gradient(180deg, #3d4a4f 0%, #4a5568 100%)'
          }}
          onCreated={() => {
            // Preload is handled in Avatar.tsx. This ensures Canvas is alive.
          }}
        >
          {/* Suspense wrapper for async model loading */}
          <Suspense fallback={<LoadingIndicator />}>
            {/* Professional interview-style lighting setup */}
            <Lighting />
             
            {/* The 3D avatar */}
            <Avatar 
              gestureState={gestureState} 
              onBounds={handleBounds}
              visemes={visemes}
              enableLipSync={enableLipSync}
            />
             
            {/* Environment map for realistic reflections */}
            <Environment preset="city" />
          </Suspense>

          {/* 
            OrbitControls for camera manipulation
            - Enabled for user interaction with avatar
            - Camera is positioned for professional interview framing
            - Focus is on upper body/chest-to-head view
          */}
          <OrbitControls 
            ref={orbitRef}
            target={target}
            enableZoom
            enablePan
            enableRotate
            zoomSpeed={0.8}
            rotateSpeed={0.6}
            panSpeed={0.8}
            enableDamping
            dampingFactor={0.08}
            minDistance={0.8}
            maxDistance={25}
          />

          <SyncCamera cam={cam} target={target} orbitRef={orbitRef} />
        </Canvas>
      </div>
    </div>
  );
}

function SyncCamera({
  cam,
  target,
  orbitRef,
}: {
  cam: { position: [number, number, number]; fov: number };
  target: [number, number, number];
  orbitRef: React.RefObject<any>;
}) {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(cam.position[0], cam.position[1], cam.position[2]);
    (camera as any).fov = cam.fov;
    camera.updateProjectionMatrix();

    if (orbitRef.current) {
      orbitRef.current.target.set(target[0], target[1], target[2]);
      orbitRef.current.update();
    }
  }, [camera, cam.fov, cam.position, orbitRef, target]);

  return null;
}

/**
 * Lighting Component
 * Professional three-point lighting setup for interview-style look
 */
function Lighting() {
  return (
    <>
      {/* Ambient light - base illumination to prevent harsh shadows */}
      <ambientLight intensity={0.4} />
      
      {/* 
        Key Light - Main light source (front-right)
        This is the primary light that illuminates the face
      */}
      <directionalLight
        position={[2, 3, 2]}
        intensity={1.2}
        color="#ffffff"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      
      {/* 
        Fill Light - Softens shadows (front-left)
        Lower intensity than key light for natural look
      */}
      <directionalLight
        position={[-2, 2, 2]}
        intensity={0.6}
        color="#e0e8ff"
      />
      
      {/* 
        Back/Rim Light - Creates separation from background
        Adds a subtle glow around the silhouette
      */}
      <directionalLight
        position={[0, 2, -3]}
        intensity={0.5}
        color="#ffeedd"
      />
      
      {/* 
        Point light for subtle face highlights
        Positioned to add catchlights in the eyes
      */}
      <pointLight
        position={[0, 1, 2]}
        intensity={0.3}
        color="#ffffff"
      />
    </>
  );
}

/**
 * Loading Indicator
 * Shows while the 3D model is being loaded
 * Enhanced visual feedback for better user experience
 */
function LoadingIndicator() {
  return (
    <group>
      {/* Central loading sphere */}
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial 
          color="#4a90d9" 
          emissive="#4a90d9"
          emissiveIntensity={0.5}
          wireframe 
        />
      </mesh>
      
      {/* Rotating ring for visual interest */}
      <mesh rotation={[0, 0, Math.PI / 4]} position={[0, 1.5, 0]}>
        <torusGeometry args={[0.5, 0.05, 16, 100]} />
        <meshStandardMaterial 
          color="#6ab0ff" 
          emissive="#6ab0ff"
          emissiveIntensity={0.3}
        />
      </mesh>
    </group>
  );
}
