import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { exec } from 'node:child_process'

function build_backend_interface() {
  return {
    name: 'execute-code-on-reload',
    handleHotUpdate({ file, server }: any) {
      if (file.endsWith('.json')) {
        console.log('asyncapi.json changed. Generating TypeScript interfaces.');
        const command = 'npx -p prettier -p @pydantic-socketio/codegen pydantic-socketio-codegen /app/src/asyncapi.json -o /app/src/interfaces.tsx';
        exec(command, (error, _stdout, stderr) => {
          if (error) {
            console.error(`${error.message}`);
            return;
          }
          if (stderr) {
            console.warn(`${stderr}`);
          }

          console.log('Interfaces successfully generated.');
        });
      }

      server.ws.send({
        type: 'full-reload',
        path: '*'
      });

      return [];
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), build_backend_interface()],
  server: {
    proxy: {
      '/api': 'http://backend:8000',
      '/socket.io': { target: 'ws://backend:8000', ws: true },
    },
  },
})