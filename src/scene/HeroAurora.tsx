import { useEffect, useRef } from 'react'
import { getDeviceProfile } from '../lib/device'

/**
 * HeroAurora — the hero background composition: a WebGL color-flow shader
 * clipped to a large soft organic mask, with the rocket illustration
 * layered on top. Replaces the 23 MB aurora video with ~2 KB of GLSL.
 *
 * The shader draws three large soft color fields — orange (the page-color
 * base), cream and violet — that drift on slow sine paths and subtract
 * where they overlap. The pointer leads the orange field with eased lag
 * and bends the coordinate space, so the whole shape reacts to the mouse.
 * A static grain pass kills gradient banding.
 *
 * Battery discipline (device tiers in src/lib/device.ts):
 *   low tier / reduced motion → one static frame, no listeners, rocket shown as-is
 *   mid tier  → ~30 fps (every 2nd rAF), DPR 1
 *   high tier → full rate, DPR ≤ 1.75
 * The loop stops when the hero leaves the viewport or the tab is hidden.
 */

const VERT_SRC = `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`

const FRAG_SRC = `
precision highp float;

uniform vec2  u_res;
uniform float u_time;
uniform vec2  u_mouse;      // normalized, y measured from the top
uniform float u_mouseActive;
uniform float u_dpr;
uniform vec3  u_colOrange;  // 0..1
uniform vec3  u_colCream;
uniform vec3  u_colViolet;

float rand(vec2 co) {
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453) / u_dpr;
}

float circle(vec2 st, vec2 c, float r, float blur) {
  float d = distance(st, c) * 2.0;
  return 1.0 - smoothstep(r, r + blur, d);
}

void main() {
  vec2 fst = gl_FragCoord.xy / u_res;
  float aspect = u_res.x / u_res.y;
  vec2 mst = fst;
  vec2 m = u_mouse;

  // Palette micro-shifts: each color slowly leans toward a neighbouring hue
  // and back, so the shape's colors are never quite the same two visits.
  vec3 colO = mix(u_colOrange, vec3(0.94, 0.25, 0.45), 0.25 * (0.5 + 0.5 * sin(u_time * 0.09)));
  vec3 colC = mix(u_colCream,  vec3(1.00, 0.88, 0.62), 0.25 * (0.5 + 0.5 * sin(u_time * 0.075)));
  vec3 colV = mix(u_colViolet, vec3(0.61, 0.55, 1.00), 0.25 * (0.5 + 0.5 * sin(u_time * 0.082)));

  // Field centers: orange follows the pointer (center on touch), cream and
  // violet drift on slow crossed sines — wide amplitude so the colors
  // travel visibly across the shape and never sync up.
  vec2 cOrange = vec2(m.x, 1.0 - m.y);
  vec2 cCream = vec2(
    (0.5 + sin(u_time * 0.4) * 0.62 * cos(u_time * 0.2) * 0.62) * aspect,
    0.5 + sin(u_time * 0.3) * 0.62 * cos(u_time * 0.5) * 0.62
  );
  vec2 cViolet = vec2(
    (0.5 + cos(u_time * 0.5) * 0.62 * sin(u_time * 0.2) * 0.62) * aspect,
    0.5 + cos(u_time * 0.4) * 0.62 * sin(u_time * 0.3) * 0.62
  );

  // The pointer bends the coordinate space — the further from the center the
  // mouse sits, the more the fields lean toward it. A slow autonomous sway
  // keeps the colors shifting even when nobody is moving the mouse.
  float warpX = (m.x - 0.5) * 12.0 * u_mouseActive + 1.6 * sin(u_time * 0.12);
  float warpY = (m.y - 0.5) * 12.0 * u_mouseActive + 1.6 * cos(u_time * 0.10);
  mst.x += cos(u_time * 0.37 + mst.x * 15.0) * 0.21
         * sin(u_time * 0.14 + mst.y * 7.0) * 0.29 * warpX;
  mst.y += sin(u_time * 0.15 + mst.x * 13.0) * 0.37
         * cos(u_time * 0.36 + mst.y * 5.0) * 0.12 * warpY;

  float fO = circle(mst, cOrange, 0.75, 0.75);
  float fC = circle(mst, cCream, 1.0, 1.0);
  float fV = circle(mst, cViolet, 1.0, 1.0);

  // Subtractive stack: overlaps carve darker seams instead of clipping.
  float x1 = fC - fC * fV;
  float x2 = fC - fC * fO;
  x1 -= x1 * x2;
  x2 -= x1 * x2;
  float x5 = (fV - fV * fC) - x1 * x2;
  float tail = fC * (x1 - fC) * (x2 - fC);

  vec3 rgb = x1 * colO + x2 * colV + x5 * colC
           + fC * colC * tail;
  float a = x1 + x2 + x5 + tail;

  float noise = rand(fst * 10.0) * 0.2;
  rgb *= 1.0 - vec3(noise);

  gl_FragColor = vec4(rgb, a);
}
`

const COL_ORANGE: [number, number, number] = [232 / 255, 64 / 255, 13 / 255]
const COL_CREAM: [number, number, number] = [255 / 255, 238 / 255, 216 / 255]
const COL_VIOLET: [number, number, number] = [208 / 255, 178 / 255, 255 / 255]

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.warn('HeroAurora shader:', gl.getShaderInfoLog(sh))
    gl.deleteShader(sh)
    return null
  }
  return sh
}

/**
 * The organic swoosh that clips the shader: from the top-right edge,
 * a long curve sweeps down to the bottom-left corner, up the left edge,
 * and back along the top. Proportional to the container, recomputed on
 * resize. Geometry in plain CSS pixels (SVG has no viewBox).
 */
function maskPath(w: number, h: number) {
  const bottom = Math.max(0, h - 40)
  return [
    `M${0.955 * w},${0.4 * h}`,
    `L${0.967 * w},${0.43 * h}`,
    `C${0.7 * w},${0.75 * h} ${0.31 * w},${0.89 * h} 0,${bottom}`,
    `V40`,
    `C${0.2 * w},${0.39 * h} ${0.71 * w},${0.49 * h} ${0.94 * w},${0.36 * h}`,
    `Z`,
  ].join(' ')
}

export function HeroAurora() {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pathRef = useRef<SVGPathElement>(null)
  const blurRef = useRef<SVGFEGaussianBlurElement>(null)

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return

    const { tier, reducedMotion, isTouch } = getDeviceProfile()
    const staticOnly = reducedMotion || tier === 'low' || isTouch
    const maxDpr = tier === 'high' ? 1.75 : 1
    const frameSkip = tier === 'high' ? 1 : 2

    // The CSS composition beneath the canvas is the low-tier still frame.
    // Avoid allocating a WebGL context at all on these devices.
    if (staticOnly) return

    let width = 1
    let height = 1

    const layout = () => {
      const w = Math.max(1, wrap.clientWidth)
      const h = Math.max(1, wrap.clientHeight)
      if (pathRef.current) pathRef.current.setAttribute('d', maskPath(w, h))
      if (blurRef.current) {
        blurRef.current.setAttribute('stdDeviation', window.innerWidth <= 991 ? '10' : '20')
      }
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr)
      const bw = Math.max(1, Math.round(w * dpr))
      const bh = Math.max(1, Math.round(h * dpr))
      if (bw !== canvas.width || bh !== canvas.height) {
        canvas.width = bw
        canvas.height = bh
      }
      width = canvas.width
      height = canvas.height
    }

    // ── WebGL shader ────────────────────────────────────────────────
    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'low-power',
    }) as WebGLRenderingContext | null
    if (!gl || gl.isContextLost()) return

    const vert = compile(gl, gl.VERTEX_SHADER, VERT_SRC)
    const frag = compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC)
    if (!vert || !frag) return
    const prog = gl.createProgram()!
    gl.attachShader(prog, vert)
    gl.attachShader(prog, frag)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW)
    const aPos = gl.getAttribLocation(prog, 'aPos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const u = {
      res: gl.getUniformLocation(prog, 'u_res'),
      time: gl.getUniformLocation(prog, 'u_time'),
      mouse: gl.getUniformLocation(prog, 'u_mouse'),
      mouseActive: gl.getUniformLocation(prog, 'u_mouseActive'),
      dpr: gl.getUniformLocation(prog, 'u_dpr'),
      colOrange: gl.getUniformLocation(prog, 'u_colOrange'),
      colCream: gl.getUniformLocation(prog, 'u_colCream'),
      colViolet: gl.getUniformLocation(prog, 'u_colViolet'),
    }
    gl.uniform3fv(u.colOrange, COL_ORANGE)
    gl.uniform3fv(u.colCream, COL_CREAM)
    gl.uniform3fv(u.colViolet, COL_VIOLET)

    // Pointer follows with easing; touch devices keep the centered rest
    // state (no warp, orange field parked mid-shape).
    const mouse = { x: 0.5, y: 0.5 }
    const target = { x: 0.5, y: 0.5 }
    let mouseActive = 0
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const r = canvas.getBoundingClientRect()
      target.x = (e.clientX - r.left) / Math.max(r.width, 1)
      target.y = (e.clientY - r.top) / Math.max(r.height, 1)
      mouseActive = 1
    }

    const t0 = Date.now()
    let frame = 0

    const draw = (elapsedMs: number) => {
      gl.viewport(0, 0, width, height)
      gl.useProgram(prog)
      gl.uniform2f(u.res, width, height)
      gl.uniform1f(u.time, elapsedMs * 0.0025)
      gl.uniform2f(u.mouse, mouse.x, mouse.y)
      gl.uniform1f(u.mouseActive, mouseActive)
      gl.uniform1f(u.dpr, Math.min(window.devicePixelRatio || 1, maxDpr))
      gl.drawArrays(gl.TRIANGLES, 0, 6)
    }

    let raf = 0
    let running = false
    const loop = () => {
      raf = requestAnimationFrame(loop)
      if (++frame % frameSkip !== 0) return
      mouse.x += (target.x - mouse.x) * 0.05
      mouse.y += (target.y - mouse.y) * 0.05
      draw(Date.now() - t0)
    }
    const start = () => {
      if (running) return
      running = true
      layout()
      if (!isTouch) window.addEventListener('pointermove', onPointer, { passive: true })
      raf = requestAnimationFrame(loop)
    }
    const stop = () => {
      if (!running) return
      running = false
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onPointer)
    }

    layout()
    // First paint is a complete static composition — even in rAF-starved
    // webviews the hero looks finished; the loop only adds the drift.
    draw(0)
    canvas.classList.add('is-live')

    const ro = new ResizeObserver(() => {
      layout()
      if (!running) draw(Date.now() - t0)
    })
    ro.observe(wrap)

    let inView = true
    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting
        inView ? start() : stop()
      },
      { rootMargin: '120px' },
    )
    io.observe(canvas)
    const onVisibility = () => (document.hidden ? stop() : inView && start())
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      io.disconnect()
      ro.disconnect()
      stop()
    }
  }, [])

  return (
    <div ref={wrapRef} className="hero-aurora-holder">
      <svg className="hero-aurora-mask" aria-hidden="true">
        <defs>
          <filter id="aurora-blur" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur ref={blurRef} stdDeviation="20" />
          </filter>
          <mask id="aurora-mask" maskUnits="userSpaceOnUse">
            <path ref={pathRef} fill="white" filter="url(#aurora-blur)" d="M0,0" />
          </mask>
        </defs>
      </svg>
      <canvas ref={canvasRef} className="hero-aurora-canvas" />
    </div>
  )
}
