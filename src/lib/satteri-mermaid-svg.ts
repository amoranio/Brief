import { defineMdastPlugin } from 'satteri';
import { renderMermaidSvg } from './mermaid-svg';

export const mermaidSvgPlugin = defineMdastPlugin({
	name: 'mermaid-svg',
	code(node) {
		if (node.lang !== 'mermaid') return;
		return { type: 'html', value: renderMermaidSvg(node.value) };
	},
});
