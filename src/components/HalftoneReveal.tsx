import { useEffect, useRef, useState } from 'react'
import { Mesh, Program, Renderer, Texture, Triangle } from 'ogl'
import { getDeviceProfile } from '../lib/device'

type HalftoneRevealProps = {
  src: string
  alt: string
  inkColor?: string
  paperColor?: string
  className?: string
}

const vertex = `#version 300 es
in vec2 position;
out vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`

const fragment = `#version 300 es
precision highp float;

uniform sampler2D tMap;
uniform vec2 iResolution;
uniform vec2 uImageSize;
uniform vec2 uMouse;
uniform float uActivity;
uniform vec3 uInk;
uniform vec3 uPaper;

in vec2 vUv;
out vec4 fragColor;

vec2 coverUv(vec2 uv) {
  float imageAspect = uImageSize.x / max(uImageSize.y, 1.0);
  float panelAspect = iResolution.x / max(iResolution.y, 1.0);
  vec2 scale = panelAspect > imageAspect ? vec2(1.0, imageAspect / panelAspect) : vec2(panelAspect / imageAspect, 1.0);
  return (uv - 0.5) * scale + 0.5;
}

void main() {
  vec2 aspect = vec2(iResolution.x / max(iResolution.y, 1.0), 1.0);
  vec2 sampleUv = coverUv(vUv);
  vec3 photo = texture(tMap, clamp(sampleUv, 0.0, 1.0)).rgb;
  float luminance = dot(photo, vec3(0.299, 0.587, 0.114));

  vec2 cell = vUv * aspect * 48.0;
  vec2 dotPosition = fract(cell) - 0.5;
  float dotRadius = sqrt(clamp(1.0 - luminance, 0.0, 1.0)) * 0.46;
  float edge = fwidth(length(dotPosition)) * 1.6;
  float dot = 1.0 - smoothstep(dotRadius - edge, dotRadius + edge, length(dotPosition));
  vec3 blackAndWhiteHalftone = mix(uPaper, uInk, dot);

  vec2 mouseDelta = (vUv - uMouse) * aspect;
  float distanceFromMouse = length(mouseDelta);
  float mouseReveal = 1.0 - smoothstep(0.22, 0.52, distanceFromMouse);
  mouseReveal *= uActivity;
  float baseReveal = 0.18;
  float reveal = max(baseReveal, mouseReveal);
  vec3 color = mix(blackAndWhiteHalftone, photo, reveal);

  fragColor = vec4(color, 1.0);
}`

function hexToRgb(hex: string) {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return match
    ? [Number.parseInt(match[1], 16) / 255, Number.parseInt(match[2], 16) / 255, Number.parseInt(match[3], 16) / 255]
    : [0, 0, 0]
}

export function HalftoneReveal({
  src,
  alt,
  inkColor = '#24203d',
  paperColor = '#f2ecff',
  className = '',
}: HalftoneRevealProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [webglAvailable, setWebglAvailable] = useState(true)
  const [nearViewport, setNearViewport] = useState(false)
  const { maxDpr, reducedMotion, tier } = getDeviceProfile()
  const staticOnly = reducedMotion || tier === 'low'

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    if (!('IntersectionObserver' in window)) {
      setNearViewport(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setNearViewport(true)
        observer.disconnect()
      },
      { rootMargin: '180px' },
    )
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container || !webglAvailable || staticOnly || !nearViewport) return

    const probe = document.createElement('canvas').getContext('webgl2')
    if (!probe) {
      setWebglAvailable(false)
      return
    }
    probe.getExtension('WEBGL_lose_context')?.loseContext()

    const renderer = new Renderer({
      dpr: Math.min(window.devicePixelRatio || 1, maxDpr),
      alpha: false,
      antialias: tier === 'high',
      webgl: 2,
    })
    const gl = renderer.gl
    const texture = new Texture(gl, { generateMipmaps: false })
    const uniforms = {
      tMap: { value: texture },
      iResolution: { value: [1, 1] },
      uImageSize: { value: [1, 1] },
      uMouse: { value: [0.5, 0.5] },
      uActivity: { value: 0 },
      uInk: { value: hexToRgb(inkColor) },
      uPaper: { value: hexToRgb(paperColor) },
    }
    const program = new Program(gl, { vertex, fragment, uniforms })
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program })
    const image = new Image()
    let frame = 0
    let running = false
    let visible = true
    let lastDraw = 0
    let lastPointerMove = 0
    let currentActivity = 0
    let targetActivity = 0
    let mouse = { x: 0.5, y: 0.5 }
    let smoothMouse = { x: 0.5, y: 0.5 }
    const frameInterval = 1000 / (tier === 'high' ? 60 : 30)

    gl.canvas.setAttribute('aria-hidden', 'true')
    container.appendChild(gl.canvas)
    image.onload = () => {
      texture.image = image
      uniforms.uImageSize.value = [image.naturalWidth, image.naturalHeight]
      texture.needsUpdate = true
      draw()
    }
    image.src = src
    if (image.complete && image.naturalWidth) {
      texture.image = image
      uniforms.uImageSize.value = [image.naturalWidth, image.naturalHeight]
      texture.needsUpdate = true
    }

    const resize = () => {
      renderer.setSize(container.clientWidth || 1, container.clientHeight || 1)
      uniforms.iResolution.value = [gl.canvas.width, gl.canvas.height]
      draw()
    }
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(container)
    resize()

    const move = (event: PointerEvent) => {
      const bounds = container.getBoundingClientRect()
      mouse = {
        x: (event.clientX - bounds.left) / bounds.width,
        y: 1 - (event.clientY - bounds.top) / bounds.height,
      }
      targetActivity = 1
      lastPointerMove = performance.now()
      start()
    }
    const leave = () => {
      targetActivity = 0
      lastPointerMove = performance.now()
      start()
    }
    container.addEventListener('pointermove', move, { passive: true })
    container.addEventListener('pointerenter', move, { passive: true })
    container.addEventListener('pointerleave', leave)

    function draw() {
      if (!visible) return
      smoothMouse.x += (mouse.x - smoothMouse.x) * 0.12
      smoothMouse.y += (mouse.y - smoothMouse.y) * 0.12
      currentActivity += (targetActivity - currentActivity) * 0.1
      uniforms.uMouse.value = [smoothMouse.x, smoothMouse.y]
      uniforms.uActivity.value = currentActivity
      renderer.render({ scene: mesh })
    }

    const hasMotion = () =>
      Math.abs(mouse.x - smoothMouse.x) > 0.001 ||
      Math.abs(mouse.y - smoothMouse.y) > 0.001 ||
      Math.abs(targetActivity - currentActivity) > 0.001

    const render = (now: number) => {
      if (!running || !visible) {
        running = false
        return
      }
      if (now - lastDraw >= frameInterval) {
        lastDraw = now
        draw()
        if (!hasMotion() && now - lastPointerMove > 120) {
          running = false
          return
        }
      }
      frame = requestAnimationFrame(render)
    }

    function start() {
      if (running || !visible) return
      running = true
      lastDraw = 0
      frame = requestAnimationFrame(render)
    }

    const intersection = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting
        if (visible) draw()
        else {
          running = false
          cancelAnimationFrame(frame)
        }
      },
      { rootMargin: '120px' },
    )
    intersection.observe(container)

    const onVisibility = () => {
      if (document.hidden) {
        running = false
        cancelAnimationFrame(frame)
      } else if (visible) {
        draw()
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    draw()

    return () => {
      running = false
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      intersection.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      container.removeEventListener('pointermove', move)
      container.removeEventListener('pointerenter', move)
      container.removeEventListener('pointerleave', leave)
      image.onload = null
      gl.getExtension('WEBGL_lose_context')?.loseContext()
      gl.canvas.remove()
    }
  }, [src, inkColor, paperColor, webglAvailable, staticOnly, nearViewport, maxDpr, tier])

  return (
    <div ref={containerRef} className={`halftone-reveal ${className}`.trim()} role="img" aria-label={alt}>
      <img className="halftone-fallback" src={src} alt="" loading="lazy" decoding="async" />
    </div>
  )
}
