import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, loadEnv, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

function sendError(res: ServerResponse, error: unknown) {
  const apiError = error as { statusCode?: number; message?: string }
  const status = apiError.statusCode || 500
  if (status >= 500) console.error(error)

  sendJson(res, status, {
    error: status >= 500 ? '서버에서 문제가 발생했습니다.' : apiError.message,
  })
}

function applicationsDevApi() {
  return {
    name: 'applications-dev-api',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(
        '/api/applications',
        async (req: IncomingMessage, res: ServerResponse) => {
          res.setHeader('Cache-Control', 'no-store')

          try {
            const api = await import(new URL('./api/_db.js', import.meta.url).href)
            const method = req.method || 'GET'
            const pathname = new URL(req.url || '/', 'http://localhost').pathname
            const id = pathname === '/' ? '' : decodeURIComponent(pathname.slice(1))

            if (method === 'GET' && !id) {
              return sendJson(res, 200, await api.listApplications())
            }

            if (method === 'POST' && !id) {
              const body = await api.readJsonBody(req)
              return sendJson(res, 201, await api.createApplication(body))
            }

            if (method === 'DELETE' && id) {
              const deleted = await api.deleteApplication(id)
              if (!deleted) return sendJson(res, 404, { error: '신청을 찾을 수 없습니다.' })
              res.statusCode = 204
              return res.end()
            }

            res.setHeader('Allow', id ? 'DELETE' : 'GET, POST')
            return sendJson(res, 405, { error: '지원하지 않는 요청입니다.' })
          } catch (error) {
            return sendError(res, error)
          }
        },
      )
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  process.env.DATABASE_URL ||= env.DATABASE_URL
  process.env.POSTGRES_URL ||= env.POSTGRES_URL

  return {
    plugins: [applicationsDevApi(), react()],
  }
})
