import { Float, Sparkles } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useRef, useEffect, useState, useCallback } from 'react'
import * as THREE from 'three'
import { getDeviceProfile } from '../lib/device'

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 720)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 720px)')
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return mobile
}

// Smooth mouse position tracked globally for efficiency
const mouse = { x: 0, y: 0 }

function FrameLimiter({ fps }: { fps: number }) {
  const invalidate = useThree((state) => state.invalidate)

  useEffect(() => {
    const interval = 1000 / fps
    let frame = 0
    let last = 0
    const tick = (now: number) => {
      if (now - last >= interval) {
        last = now
        invalidate()
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [fps, invalidate])

  return null
}

// A glowing orbital ring with a traveling node
function OrbitalPath({
  radius,
  speed,
  tilt,
  tiltZ = 0,
  color,
  nodeColor,
  opacity = 0.45,
  nodeSize = 0.058,
  tubeRadius = 0.008,
}: {
  radius: number
  speed: number
  tilt: number
  tiltZ?: number
  color: string
  nodeColor: string
  opacity?: number
  nodeSize?: number
  tubeRadius?: number
}) {
  const orbitRef = useRef<THREE.Group>(null)
  const nodeRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (orbitRef.current) orbitRef.current.rotation.z = t * speed

    // Traveling node angle
    const angle = t * speed * 1.0
    if (nodeRef.current) {
      nodeRef.current.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        0,
      )
      // Pulse scale
      const pulse = 1 + Math.sin(t * 3.2 + radius) * 0.18
      nodeRef.current.scale.setScalar(pulse)
    }
    if (glowRef.current) {
      glowRef.current.position.set(
        Math.cos(angle) * radius,
        Math.sin(angle) * radius,
        0,
      )
      const glowPulse = 1 + Math.sin(t * 3.2 + radius) * 0.25
      glowRef.current.scale.setScalar(glowPulse)
    }
  })

  return (
    <group rotation={[tilt, 0.18, tiltZ]}>
      {/* Ring */}
      <mesh>
        <torusGeometry args={[radius, tubeRadius, 8, 90]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} />
      </mesh>
      {/* Glow halo around ring */}
      <mesh>
        <torusGeometry args={[radius, tubeRadius * 3.5, 8, 90]} />
        <meshBasicMaterial color={color} transparent opacity={opacity * 0.12} />
      </mesh>
      {/* Traveling node outer glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[nodeSize * 2.4, 10, 10]} />
        <meshBasicMaterial color={nodeColor} transparent opacity={0.14} />
      </mesh>
      {/* Traveling node */}
      <mesh ref={nodeRef}>
        <sphereGeometry args={[nodeSize, 12, 12]} />
        <meshBasicMaterial color={nodeColor} />
      </mesh>
      {/* Secondary anchor dot, opposite side */}
      <group ref={orbitRef}>
        <mesh position={[-radius * 0.62, radius * 0.78, 0]}>
          <sphereGeometry args={[nodeSize * 0.55, 8, 8]} />
          <meshBasicMaterial color={color} transparent opacity={0.5} />
        </mesh>
      </group>
    </group>
  )
}

// The crystalline knowledge core
function KnowledgeCore({ mobile }: { mobile: boolean }) {
  const assembly = useRef<THREE.Group>(null)
  const innerGlow = useRef<THREE.Mesh>(null)
  const outerShell = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!assembly.current) return
    const t = clock.getElapsedTime()

    // Smooth mouse-driven tilt — fix: lerp toward target directly
    const targetX = mobile ? 0 : -mouse.y * 0.14
    const targetY = mobile ? t * 0.07 : mouse.x * 0.22 + t * 0.04
    assembly.current.rotation.x = THREE.MathUtils.lerp(assembly.current.rotation.x, targetX, 0.032)
    assembly.current.rotation.y = THREE.MathUtils.lerp(assembly.current.rotation.y, targetY, 0.032)

    // Core inner glow pulse
    if (innerGlow.current) {
      const glowPulse = 1 + Math.sin(t * 1.4) * 0.04
      innerGlow.current.scale.setScalar(glowPulse)
    }
    // Outer shell slow breathe
    if (outerShell.current) {
      outerShell.current.material instanceof THREE.MeshBasicMaterial &&
        (outerShell.current.material.opacity = 0.055 + Math.sin(t * 0.8) * 0.02)
    }
  })

  return (
    <group ref={assembly} rotation={[0.08, -0.4, -0.15]}>
      <Float speed={1.2} rotationIntensity={0.18} floatIntensity={mobile ? 0.4 : 0.7}>
        {/* Outer subtle shell */}
        <mesh ref={outerShell} scale={1.22}>
          <icosahedronGeometry args={[0.79, 1]} />
          <meshBasicMaterial color="#d0c8ff" transparent opacity={0.055} side={THREE.BackSide} />
        </mesh>

        {/* Primary crystal core */}
        <mesh>
          <icosahedronGeometry args={[0.79, mobile ? 1 : 2]} />
          <meshPhysicalMaterial
            color="#bdb6ff"
            roughness={0.08}
            metalness={0.06}
            transmission={0.18}
            thickness={1.1}
            clearcoat={1}
            clearcoatRoughness={0.05}
            reflectivity={0.6}
            iridescence={0.35}
            iridescenceIOR={1.4}
          />
        </mesh>

        {/* Inner glow volume */}
        <mesh ref={innerGlow} scale={0.72}>
          <icosahedronGeometry args={[0.79, 1]} />
          <meshBasicMaterial color="#b8aaff" transparent opacity={0.22} />
        </mesh>

        {/* Wireframe overlay for crystalline structure */}
        <mesh scale={1.04}>
          <icosahedronGeometry args={[0.79, 1]} />
          <meshBasicMaterial color="#e2ddff" transparent opacity={0.09} wireframe />
        </mesh>

        {/* Three meaningful orbital paths */}
        {/* Foundation orbit — lime, inner */}
        <OrbitalPath
          radius={1.18}
          speed={0.58}
          tilt={0.68}
          tiltZ={-0.3}
          color="#c7ffb0"
          nodeColor="#d2f56c"
          opacity={0.38}
          nodeSize={0.052}
        />

        {/* Momentum orbit — lilac, featured */}
        {!mobile && (
          <OrbitalPath
            radius={1.52}
            speed={-0.31}
            tilt={-0.88}
            tiltZ={0.42}
            color="#9b8cff"
            nodeColor="#a897ff"
            opacity={0.5}
            nodeSize={0.064}
            tubeRadius={0.011}
          />
        )}

        {/* Intensive orbit — peach, outer */}
        <OrbitalPath
          radius={1.82}
          speed={0.19}
          tilt={0.12}
          tiltZ={0.7}
          color="#ffc2a0"
          nodeColor="#ffb380"
          opacity={0.32}
          nodeSize={0.048}
        />
      </Float>

      {/* Book accent — a subtle floating rectangular slab */}
      {!mobile && (
        <group position={[-0.72, 0.38, 0.52]} rotation={[0.08, 0.48, -0.38]}>
          <mesh>
            <boxGeometry args={[0.38, 0.27, 0.06]} />
            <meshStandardMaterial color="#f7f5ee" roughness={0.72} />
          </mesh>
          <mesh position={[0, 0, 0.035]}>
            <planeGeometry args={[0.26, 0.15]} />
            <meshBasicMaterial color="#1c1b2b" transparent opacity={0.85} />
          </mesh>
          {/* Spine */}
          <mesh position={[-0.19, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <planeGeometry args={[0.06, 0.27]} />
            <meshBasicMaterial color="#4d4198" />
          </mesh>
        </group>
      )}
    </group>
  )
}

// Fallback for when WebGL is unavailable (CSS-only)
function CSSFallback() {
  return (
    <div className="hero-css-fallback" aria-hidden="true">
      <div className="css-core" />
      <div className="css-ring css-ring-1" />
      <div className="css-ring css-ring-2" />
      <div className="css-ring css-ring-3" />
    </div>
  )
}

export function HeroScene() {
  const mobile = useIsMobile()
  const [webglFailed, setWebglFailed] = useState(false)
  const { tier, maxDpr, reducedMotion } = getDeviceProfile()

  useEffect(() => {
    if (mobile || reducedMotion || tier === 'low') return
    const trackMouse = (event: MouseEvent) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1
    }
    window.addEventListener('mousemove', trackMouse, { passive: true })
    return () => window.removeEventListener('mousemove', trackMouse)
  }, [mobile, reducedMotion, tier])

  const handleCreated = useCallback(({ gl }: { gl: THREE.WebGLRenderer }) => {
    if (!gl.getContext()) setWebglFailed(true)
  }, [])

  if (webglFailed || reducedMotion || tier === 'low') return <CSSFallback />

  return (
    <div className="hero-scene" aria-label="An abstract orbital study object representing the MentoraX learning journey" role="img">
      <Canvas
        dpr={[1, maxDpr]}
        camera={{ fov: 42, position: [0, 0, 5.4] }}
        gl={{ alpha: true, antialias: tier === 'high', powerPreference: 'high-performance' }}
        frameloop="demand"
        performance={{ min: 0.5 }}
        onCreated={handleCreated}
      >
        <FrameLimiter fps={tier === 'high' ? 60 : 30} />
        {/* Rich layered lighting */}
        <ambientLight intensity={1.1} color="#f5f0ff" />
        <directionalLight position={[3, 6, 3]} intensity={2.0} color="#fff8ee" />
        <pointLight position={[-5, 1, 2]} intensity={22} color="#7f71ff" distance={13} decay={2} />
        <pointLight position={[2, -4, 1.5]} intensity={14} color="#c7ffb0" distance={10} decay={2} />
        <pointLight position={[4.5, 1, -1]} intensity={9} color="#ffb399" distance={9} decay={2} />
        <pointLight position={[0, 3, -3]} intensity={6} color="#d0e8ff" distance={8} decay={2} />

        <KnowledgeCore mobile={mobile} />

        <Sparkles
          count={mobile ? 22 : 48}
          scale={[7, 6, 4]}
          size={mobile ? 0.9 : 1.1}
          speed={0.15}
          opacity={0.55}
          color="#f8f0e3"
        />
      </Canvas>
    </div>
  )
}
