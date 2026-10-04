import type { ApiRequest } from './_types.js'

export function isSameOriginRequest(req: ApiRequest): boolean {
  const origin = req.headers?.origin
  if (origin === undefined) return true

  const host = req.headers?.host
  const forwardedProtocol = req.headers?.['x-forwarded-proto']
  const originValue = Array.isArray(origin) ? origin[0] : origin
  const hostValue = Array.isArray(host) ? host[0] : host
  const protocolValue = Array.isArray(forwardedProtocol) ? forwardedProtocol[0] : forwardedProtocol
  if (typeof originValue !== 'string' || typeof hostValue !== 'string') return false

  try {
    const parsedOrigin = new URL(originValue)
    return parsedOrigin.host.toLowerCase() === hostValue.toLowerCase() &&
      (typeof protocolValue !== 'string' ||
        parsedOrigin.protocol === `${protocolValue.split(',')[0].trim().toLowerCase()}:`)
  } catch {
    return false
  }
}
