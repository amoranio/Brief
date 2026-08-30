// @ts-check
import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import { mermaidSvgPlugin } from './src/lib/satteri-mermaid-svg.ts';

export default defineConfig({
	site: 'https://brief.amoran.io',
	markdown: {
		syntaxHighlight: {
			type: 'shiki',
			excludeLangs: ['mermaid'],
		},
		processor: satteri({
			mdastPlugins: [mermaidSvgPlugin],
		}),
	},
});
