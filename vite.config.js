import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// [https://vitejs.dev/config/](https://vitejs.dev/config/)
export default defineConfig({
  plugins: [react()],
  build: {
    // This setting tells the bundler (Rollup/Vercel) to treat the Firebase
    // modules as external dependencies, preventing the "unintended module" error.
    rollupOptions: {
      external: [
        // We must include all specific Firebase sub-modules used in App.tsx
        'firebase/app',
        'firebase/auth',
        'firebase/firestore',
        // It's also good practice to include the main entry point
        'firebase', 
        'lucide-react' // While not strictly necessary, sometimes helps with icons
      ], 
    }
  }
})
