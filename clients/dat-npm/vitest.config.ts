import { defineConfig } from 'vitest/config'


export default defineConfig({
    test: {
        disableConsoleIntercept: true,
        printConsoleTrace: true,
        dangerouslyIgnoreUnhandledErrors: true,
    },
})
