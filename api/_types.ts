/**
 * Minimal request/response types for the serverless handlers in `api/`.
 *
 * Why this file exists
 * --------------------
 * These handlers used to `import type { VercelRequest, VercelResponse } from '@vercel/node'`.
 * That package only ships the *types* we need, but it is a devDependency, so any build
 * that installs production dependencies only (or typechecks functions in isolation)
 * failed with:
 *
 *     error TS2307: Cannot find module '@vercel/node' or its corresponding type declarations.
 *
 * Vercel then refused to build the functions, every `/api/*` request 404'd, and the
 * checkout silently fell back to a fake receipt — a customer could "buy" a book
 * without paying and without receiving an email.
 *
 * The shapes below describe exactly how the handlers use the Vercel runtime:
 * `req.method`, `req.body`, `req.query`, plus `res.setHeader`, `res.status().json()`
 * and `res.end()`. They are structurally compatible with the real
 * `VercelRequest`/`VercelResponse` (which extend Node's `IncomingMessage`/
 * `ServerResponse`), so `handler(req, res)` type-checks on both runtimes:
 * Vercel's Node functions and the local dev adapter in `vite.config.ts`.
 */

export type ApiQueryValue = string | string[] | undefined

export type ApiRequest<TBody = Record<string, unknown>> = {
  method?: string
  url?: string
  headers?: Record<string, string | string[] | undefined>
  query?: Record<string, ApiQueryValue>
  body?: TBody
}

export type ApiResponse = {
  statusCode: number
  setHeader(name: string, value: string | number | readonly string[]): unknown
  getHeader?(name: string): unknown
  status(code: number): ApiResponse
  json(data: unknown): ApiResponse
  send?(body?: unknown): ApiResponse
  end(chunk?: unknown): unknown
}
