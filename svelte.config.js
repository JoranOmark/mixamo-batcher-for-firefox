import sveltePreprocess from 'svelte-preprocess'

export default {
  preprocess: [
    // Svelte can embed source line endings inside generated string literals.
    { markup: ({ content }) => ({ code: content.replace(/\r\n/g, '\n') }) },
    sveltePreprocess({
      typescript: {
        tsconfigFile: './tsconfig.svelte.json',
      },
    }),
  ],
}
