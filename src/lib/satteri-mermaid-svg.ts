import { defineMdastPlugin } from 'satteri';
import { renderMermaidSvg } from './mermaid-svg';

function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}

export const mermaidSvgPlugin = defineMdastPlugin({
	name: 'mermaid-svg',
	code(node) {
		if (node.lang !== 'mermaid') return;
		try {
			return { type: 'html', value: renderMermaidSvg(node.value) };
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			console.error(`mermaid-svg: render failed (${message}); falling back to source`);
			return {
				type: 'html',
				value: `<pre class="diagram-fallback"><code>${escapeHtml(node.value)}</code></pre>`,
			};
		}
	},
});
