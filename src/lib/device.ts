/**
 * Device capability detection — the foundation of the mobile-first architecture.
 *
 * The site is authored for the lowest-power device in the room (a mid-range
 * Android phone) and progressively enhances upward:
 *
 *   low  → cheap everything: no backdrop-filter, no decorative WebGL,
 *          no infinite animations, DPR capped at 1
 *   mid  → default phones + weak laptops: reduced blur radii,
 *          lighter WebGL (fewer particles, capped DPR)
 *   high → desktops / flagship phones: full effects
 *
 * Values are computed once at boot. They intentionally do NOT react to
 * runtime changes — swapping tiers mid-session would remount canvases and
 * cause a visible hitch, which is exactly what this layer exists to prevent.
 */

export type DeviceTier = 'low' | 'mid' | 'high'

export interface DeviceProfile {
  tier: DeviceTier
  isMobile: boolean
  isAndroid: boolean
  isTouch: boolean
  reducedMotion: boolean
  /** Max device-pixel-ratio to feed WebGL canvases for this device */
  maxDpr: number
  /** Whether decorative WebGL (clouds, sparkles beyond minimum) should run */
  allowDecorativeWebGL: boolean
}

let cached: DeviceProfile | null = null

export function getDeviceProfile(): DeviceProfile {
  if (cached) return cached

  const nav = navigator as Navigator & { deviceMemory?: number }
  const isAndroid = /android/i.test(nav.userAgent)
  const isTouch = matchMedia('(hover: none) and (pointer: coarse)').matches
  const isMobile = isTouch || matchMedia('(max-width: 720px)').matches
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches

  const cores = nav.hardwareConcurrency ?? 4
  const memory = nav.deviceMemory ?? 4 // GB, Chrome-only; fallback is safe

  let tier: DeviceTier
  if (reducedMotion) {
    tier = 'low'
  } else if (isMobile || isAndroid) {
    // Phones: judge by cores/RAM. Most mid-range Androids report 4-6 cores.
    tier = cores >= 6 && memory >= 4 ? 'mid' : 'low'
    if (isAndroid && cores >= 8 && memory >= 6) tier = 'high'
  } else {
    tier = cores >= 8 ? 'high' : 'mid'
  }

  const maxDpr = tier === 'high' ? 1.8 : tier === 'mid' ? 1.5 : 1

  cached = {
    tier,
    isMobile,
    isAndroid,
    isTouch,
    reducedMotion,
    maxDpr,
    allowDecorativeWebGL: tier !== 'low' && !reducedMotion,
  }
  return cached
}

/**
 * Stamp capability classes on <html> before React renders, so the very first
 * paint already uses the right effect level (no flash of heavy → light).
 * Called once from main.tsx.
 */
export function applyDeviceClasses() {
  const p = getDeviceProfile()
  const root = document.documentElement
  root.dataset.tier = p.tier
  if (p.isMobile) root.classList.add('is-mobile')
  if (p.isAndroid) root.classList.add('is-android')
  if (p.isTouch) root.classList.add('is-touch')
}
