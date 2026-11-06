import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // jsdom provides localStorage for the demo API tests.
    environment: 'jsdom',
  },
})
