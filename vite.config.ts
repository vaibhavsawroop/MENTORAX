import { defineConfig, loadEnv, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import fs from 'node:fs'

/**
 * Local-dev adapter for the Vercel serverless handlers in api/.
 *
 * In production Vercel executes api/*.ts natively (see vercel.json rewrites).
 * Under plain `vite dev` nothing would serve /api/*, so this middleware
 * loads the same handler files through Vite's SSR pipeline and invokes
 * them with Vercel-shaped req/res objects. No code duplication — the
 * exact same handlers run in both environments.
 */
function localApi(): Plugin {
  return {
    name: 'local-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = (req.url || '').split('?')[0]
        if (!url.startsWith('/api/') || url === '/api/') return next()

        const file = path.resolve(server.config.root, `.${url}.ts`)
        if (!fs.existsSync(file)) return next()

        try {
          // JSON body
          let body: unknown = {}
          if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
            const chunks: Buffer[] = []
            for await (const chunk of req) chunks.push(chunk as Buffer)
            const raw = Buffer.concat(chunks).toString('utf8')
            if (raw) {
              try {
                body = JSON.parse(raw)
              } catch {
                body = {}
              }
            }
          }

          // VercelRequest-shaped object
          ;(req as unknown as { body: unknown }).body = body
          ;(req as unknown as { query: Record<string, string> }).query = Object.fromEntries(
            new URLSearchParams((req.url || '').split('?')[1] || '')
          )

          // VercelResponse-shaped helpers: res.status(200).json(...) / .end()
          const r = res as typeof res & {
            status?: (code: number) => typeof res
            json?: (data: unknown) => typeof res
          }
          r.status = (code: number) => {
            res.statusCode = code
            return res
          }
          r.json = (data: unknown) => {
            if (!res.headersSent) res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify(data))
            return res
          }

          const mod = await server.ssrLoadModule(url)
          const handler = (mod as { default?: (q: unknown, s: unknown) => unknown }).default
          if (typeof handler !== 'function') return next()

          await handler(req, res)
        } catch (err) {
          console.error(`[local-api] ${url} failed:`, err)
          if (!res.headersSent) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: 'Local API handler failed — see dev server terminal.' }))
          }
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // Expose .env values (RAZORPAY_*, RESEND_*, …) to api/ handlers via process.env
  const env = loadEnv(mode, process.cwd(), '')
  for (const [key, value] of Object.entries(env)) {
    if (!(key in process.env)) process.env[key] = value
  }

  return {
    plugins: [react(), localApi()],
    build: {
      // three.js alone is ~870 kB minified. It is isolated in `vendor-3d` and
      // only fetched by the lazily-imported hero scene, so the size is expected
      // rather than a sign that something leaked into the entry chunk.
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          /**
           * Split vendor code into stable chunks.
           *
           * Before this, every dependency shared one ~590 kB entry chunk, so a
           * one-line app change invalidated the whole download and the browser
           * had to parse three.js-adjacent code on the critical path. Grouping by
           * library keeps long-lived code cached and lets the parser work in
           * parallel. `three`/`@react-three` are isolated so they are fetched
           * only by the lazily-imported hero scene, never at first paint.
           */
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined
            if (/node_modules[\\/](three|@react-three)[\\/]/.test(id)) return 'vendor-3d'
            if (/node_modules[\\/](gsap|framer-motion|lenis)[\\/]/.test(id)) return 'vendor-motion'
            if (/node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) {
              return 'vendor-react'
            }
            if (/node_modules[\\/]lucide-react[\\/]/.test(id)) return 'vendor-icons'
            return undefined
          },
        },
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5000,
      allowedHosts: ['localhost', '127.0.0.1', '.replit.dev', '.replit.app'],
    },
    preview: {
      host: '0.0.0.0',
      port: 5000,
      allowedHosts: ['localhost', '127.0.0.1', '.replit.dev', '.replit.app'],
    },
  }
})
