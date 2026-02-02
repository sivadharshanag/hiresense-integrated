/**
 * Avatar Component
 * 
 * This component loads and displays the 3D avatar model for the AI interviewer.
 * It handles the GLB model loading and applies animations based on the current gesture state.
 */

import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import type { GestureState } from '@/types/avatar';
import { AVATAR_URL, getAvatarConfig } from '@/config/avatar.config';
import { applyVisemesToMesh, VisemeFrame } from '@/services/lipSyncEngine';

// Props interface for the Avatar component
interface AvatarProps {
  gestureState: GestureState;
  onBounds?: (bounds: {
    center: [number, number, number];
    size: [number, number, number];
    focus: [number, number, number];
    maxDim: number;
  }) => void;
  // Lip sync support
  visemes?: Record<string, number> | null;
  enableLipSync?: boolean;
}

export function Avatar({ gestureState, onBounds, visemes, enableLipSync = false }: AvatarProps) {
  // Load the GLB model using drei's useGLTF hook
  const { scene } = useGLTF(AVATAR_URL);
  
  // Reference to the model group for animations/transforms
  const groupRef = useRef<THREE.Group>(null);
  
  // References for specific bones/meshes we'll animate
  const headBoneRef = useRef<THREE.Bone | null>(null);
  const meshesWithMorphTargets = useRef<THREE.SkinnedMesh[]>([]);
  
  // Animation timing references
  const timeRef = useRef(0);
  const speakingPhaseRef = useRef(0);

  // Find and store references to bones and morph target meshes on mount
  const didNormalizeRef = useRef(false);

  useEffect(() => {
    if (!scene) return;

    if (didNormalizeRef.current) return;
    didNormalizeRef.current = true;

    // Reset any previous references
    headBoneRef.current = null;
    meshesWithMorphTargets.current = [];

    // Auto-center & ground the model so camera fitting is stable across GLBs
    {
      const preBox = new THREE.Box3().setFromObject(scene);
      const preCenter = preBox.getCenter(new THREE.Vector3());
      const preMin = preBox.min.clone();

      // Center in X/Z, ground on Y
      scene.position.x -= preCenter.x;
      scene.position.z -= preCenter.z;
      scene.position.y -= preMin.y;
    }

    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.filter(Boolean).forEach((mat) => {
          mat.visible = true;
          // Some GLBs can appear black due to backface culling; this is a safe default.
          (mat as THREE.Material).side = THREE.DoubleSide;
          mat.needsUpdate = true;
        });
      }

      if (child instanceof THREE.Bone) {
        const name = child.name.toLowerCase();
        if (!headBoneRef.current && name.includes('head')) {
          headBoneRef.current = child;
        }
      }

      if (child instanceof THREE.SkinnedMesh && child.morphTargetDictionary) {
        meshesWithMorphTargets.current.push(child);
      }
    });

    // Apply friendly smile if morph targets exist (safe no-op otherwise)
    applySmileExpression(meshesWithMorphTargets.current);

    // Compute bounds for camera fitting (prefer the rendered group if available)
    // We defer one frame so the group ref has its transform applied.
    requestAnimationFrame(() => {
      const avatarConfig = getAvatarConfig();
      const scale = avatarConfig.scale ?? 1;
      const position = avatarConfig.position ?? [0, 0, 0];

      // Apply config transform BEFORE measuring bounds.
      if (groupRef.current) {
        groupRef.current.position.set(position[0], position[1], position[2]);
        groupRef.current.scale.setScalar(scale);
      }

      const targetObj = groupRef.current ?? scene;
      const box = new THREE.Box3().setFromObject(targetObj);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      // Focus slightly above center (good for interview framing)
      const focus = new THREE.Vector3(center.x, box.min.y + size.y * 0.62, center.z);
      const maxDim = Math.max(size.x, size.y, size.z);

      onBounds?.({
        center: [center.x, center.y, center.z],
        size: [size.x, size.y, size.z],
        focus: [focus.x, focus.y, focus.z],
        maxDim,
      });

    });
  }, [scene, onBounds]);

  // Animation loop - runs every frame
  useFrame((_, delta) => {
    timeRef.current += delta;
    
    const head = headBoneRef.current;
    const time = timeRef.current;
    
    // Apply lip sync visemes if enabled and provided
    if (enableLipSync && visemes && meshesWithMorphTargets.current.length > 0) {
      // Apply visemes to all meshes with morph targets
      meshesWithMorphTargets.current.forEach(mesh => {
        applyVisemesToMesh(mesh, visemes);
      });
    }
    
    // Apply different animations based on gesture state
    // If the model is not rigged (no bones), animate the whole group subtly.
    const group = groupRef.current;

    switch (gestureState) {
      case 'idle': {
        if (head) {
          animateIdle(head, time, meshesWithMorphTargets.current, enableLipSync);
        } else if (group) {
          group.rotation.y = Math.sin(time * 0.25) * 0.08;
          group.rotation.x = Math.sin(time * 0.35) * 0.02;
        }
        break;
      }
      case 'speaking': {
        speakingPhaseRef.current += delta;
        if (head) {
          animateSpeaking(head, time, meshesWithMorphTargets.current, speakingPhaseRef.current, enableLipSync);
        } else if (group) {
          group.rotation.x = Math.sin(time * 1.5) * 0.05;
          group.rotation.y = Math.sin(time * 1.1) * 0.12;
        }
        break;
      }
      case 'listening': {
        if (head) {
          animateListening(head, time, meshesWithMorphTargets.current, enableLipSync);
        } else if (group) {
          group.rotation.z = 0.08 + Math.sin(time * 0.4) * 0.03;
          group.rotation.y = Math.sin(time * 0.3) * 0.06;
        }
        break;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {/* 
        Render the loaded 3D model
        - position: adjusted to frame upper body/bust view
        - scale: adjusted for proper viewing
        - Configuration is loaded from avatar.config.ts for easy customization
      */}
      <primitive object={scene} />
    </group>
  );
}

/**
 * Idle Animation
 * Professional, confident posture with subtle natural movements
 */
function animateIdle(
  head: THREE.Bone | null, 
  time: number,
  meshes: THREE.SkinnedMesh[],
  enableLipSync: boolean
) {
  if (head) {
    // Very subtle breathing motion - gentle and professional
    head.rotation.x = Math.sin(time * 0.4) * 0.015;
    // Minimal natural sway - confident and still
    head.rotation.y = Math.sin(time * 0.25) * 0.008;
    head.rotation.z = Math.sin(time * 0.3) * 0.003;
  }
  
  // Keep slight smile during idle (only if not using lip sync)
  if (!enableLipSync) {
    setMouthOpenness(meshes, 0);
  }
}

/**
 * Speaking Animation
 * Natural head movement while speaking - like an HR interviewer explaining something
 */
function animateSpeaking(
  head: THREE.Bone | null, 
  time: number,
  meshes: THREE.SkinnedMesh[],
  speakingTime: number,
  enableLipSync: boolean
) {
  if (head) {
    // Natural head movements while speaking - expressive but professional
    // Slight nod emphasis on words
    head.rotation.x = Math.sin(time * 1.5) * 0.04 + Math.sin(time * 3) * 0.02;
    // Gentle side-to-side for emphasis
    head.rotation.y = Math.sin(time * 1.2) * 0.06;
    // Very subtle tilt
    head.rotation.z = Math.sin(time * 0.8) * 0.015;
  }
  
  // Only apply procedural mouth animation if lip sync is disabled
  if (!enableLipSync) {
    // Mouth animation - natural speech pattern
    const mouthValue = 
      Math.abs(Math.sin(speakingTime * 6)) * 0.25 +
      Math.abs(Math.sin(speakingTime * 10)) * 0.25 +
      Math.abs(Math.sin(speakingTime * 4)) * 0.15;
    
    setMouthOpenness(meshes, Math.min(mouthValue, 0.6));
  }
}

/**
 * Listening Animation
 * Attentive HR interviewer - engaged listening with occasional nods
 */
function animateListening(
  head: THREE.Bone | null, 
  time: number,
  meshes: THREE.SkinnedMesh[],
  enableLipSync: boolean
) {
  if (head) {
    // Slight interested head tilt
    head.rotation.z = Math.sin(time * 0.3) * 0.03 + 0.04;
    
    // Occasional understanding nods - every 3 seconds
    const nodCycle = time % 3;
    if (nodCycle < 0.4) {
      // Gentle nod
      head.rotation.x = Math.sin(nodCycle * Math.PI * 2.5) * 0.08;
    } else {
      // Return to attentive position with slight movement
      head.rotation.x = Math.sin(time * 0.4) * 0.015 + 0.02;
    }
    
    // Very subtle lateral movement - engaged but not distracted
    head.rotation.y = Math.sin(time * 0.35) * 0.02;
  }
  
  // Neutral attentive expression (only if not using lip sync)
  if (!enableLipSync) {
    setMouthOpenness(meshes, 0);
  }
}

/**
 * Helper function to set mouth openness using morph targets
 * Ready Player Me avatars use "mouthOpen" or "jawOpen" morph targets
 */
function setMouthOpenness(meshes: THREE.SkinnedMesh[], value: number) {
  meshes.forEach((mesh) => {
    if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
      // Try different morph target names that RPM avatars might use
      const mouthTargets = ['mouthOpen', 'jawOpen', 'viseme_aa', 'viseme_O'];
      
      for (const targetName of mouthTargets) {
        const index = mesh.morphTargetDictionary[targetName];
        if (index !== undefined) {
          mesh.morphTargetInfluences[index] = value;
        }
      }
    }
  });
}

/**
 * Apply friendly smile expression using morph targets
 */
function applySmileExpression(meshes: THREE.SkinnedMesh[]) {
  meshes.forEach((mesh) => {
    if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
      // Smile morph targets
      const smileTargets = ['mouthSmile', 'mouthSmileLeft', 'mouthSmileRight', 'smile'];
      for (const targetName of smileTargets) {
        const index = mesh.morphTargetDictionary[targetName];
        if (index !== undefined) {
          mesh.morphTargetInfluences[index] = 0.5; // Natural smile intensity
        }
      }
      
      // Slightly raised cheeks for natural smile
      const cheekTargets = ['cheekSquintLeft', 'cheekSquintRight'];
      for (const targetName of cheekTargets) {
        const index = mesh.morphTargetDictionary[targetName];
        if (index !== undefined) {
          mesh.morphTargetInfluences[index] = 0.3;
        }
      }
      
      // Slightly happy eyes
      const eyeTargets = ['eyeSquintLeft', 'eyeSquintRight'];
      for (const targetName of eyeTargets) {
        const index = mesh.morphTargetDictionary[targetName];
        if (index !== undefined) {
          mesh.morphTargetInfluences[index] = 0.2;
        }
      }
    }
  });
}

// Preload the model for better performance
useGLTF.preload(AVATAR_URL);
