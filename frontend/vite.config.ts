import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { exec } from 'node:child_process'
import path from 'node:path'

function buildBackendInterface(): Plugin {
  const specFile = path.resolve('/app/src/asyncapi.json')
  const command =
    'npx -p prettier -p @pydantic-socketio/codegen pydantic-socketio-codegen /app/src/asyncapi.json -o /app/src/interfaces.ts'

  const generateBackendInterface = () => {
    exec(command, (error, _stdout, stderr) => {
      if (error) return console.error(error.message)
      if (stderr) console.warn(stderr)
      console.log('Interfaces successfully generated.')
    })
  }

  return {
    name: 'asyncapi-codegen',
    configureServer(server) {
      server.watcher.add(specFile)
      const onChange = (file: string) => {
        if (path.resolve(file) === specFile){
          generateBackendInterface()
        }
      }
      server.watcher.on('change', onChange)
      server.watcher.on('add', onChange)
    },
  }
}

export default defineConfig({
  plugins: [react(), buildBackendInterface()],
  server: {
    proxy: {
      '/api': 'http://backend:8000',
      '/socket.io': { target: 'ws://backend:8000', ws: true },
    },
    watch: { usePolling: true },
  },
})