type Direction = 'LR' | 'RL' | 'TD' | 'TB' | 'BT';
type Shape = 'rect' | 'round' | 'diamond';

interface NodeDef {
	id: string;
	label: string;
	shape: Shape;
	subgraph?: string;
}

interface EdgeDef {
	from: string;
	to: string;
	label?: string;
}

interface SubgraphDef {
	id: string;
	title: string;
	nodes: string[];
}

interface Box {
	x: number;
	y: number;
	w: number;
	h: number;
}

const STROKE = '#111111';
const MUTED = '#5c5c5c';
const RULE = '#d6d4cf';
const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
const CHAR = 7.05;
const FONT_SIZE = 13;
const PAD_X = 14;
const PAD_Y = 10;
const MIN_W = 72;
const RANK_GAP = 54;
const NODE_GAP = 26;
const CLUSTER_PAD = 18;
const CLUSTER_TITLE = 20;
const CLUSTER_GAP = 32;
const PAGE_PAD = 8;

let diagramSerial = 0;

function escapeXml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;');
}

function textWidth(label: string): number {
	return Math.ceil(label.length * CHAR);
}

function nodeSize(node: NodeDef): { w: number; h: number } {
	const w = Math.max(MIN_W, textWidth(node.label) + PAD_X * 2);
	const h = FONT_SIZE + PAD_Y * 2;
	if (node.shape === 'diamond') {
		return { w: w + 18, h: h + 16 };
	}
	return { w, h };
}

function stripWrap(raw: string): { label: string; shape: Shape } {
	const text = raw.trim();
	if (text.startsWith('[') && text.endsWith(']')) {
		return { label: text.slice(1, -1).trim(), shape: 'rect' };
	}
	if (text.startsWith('(') && text.endsWith(')')) {
		return { label: text.slice(1, -1).trim(), shape: 'round' };
	}
	if (text.startsWith('{') && text.endsWith('}')) {
		return { label: text.slice(1, -1).trim(), shape: 'diamond' };
	}
	return { label: text, shape: 'rect' };
}

function ensureNode(nodes: Map<string, NodeDef>, id: string, deco = '', subgraph?: string): void {
	const existing = nodes.get(id);
	if (existing) {
		if (deco) {
			const parsed = stripWrap(deco);
			existing.label = parsed.label;
			existing.shape = parsed.shape;
		}
		if (subgraph && !existing.subgraph) existing.subgraph = subgraph;
		return;
	}
	const parsed = deco ? stripWrap(deco) : { label: id, shape: 'rect' as const };
	nodes.set(id, { id, label: parsed.label, shape: parsed.shape, subgraph });
}

function parseToken(token: string): { id: string; deco: string } {
	const match = token
		.trim()
		.match(/^([A-Za-z][\w-]*)(\[[^\]]*\]|\([^)]*\)|\{[^}]*\})?$/);
	if (!match) {
		throw new Error(`Cannot parse mermaid node "${token}"`);
	}
	return { id: match[1], deco: match[2] ?? '' };
}

function splitStatements(source: string): string[] {
	const lines: string[] = [];
	for (const raw of source.split(/\r?\n/)) {
		const line = raw.replace(/\s+%%.*$/, '').trim();
		if (!line || line.startsWith('%%')) continue;
		for (const part of line.split(';')) {
			const statement = part.trim();
			if (statement) lines.push(statement);
		}
	}
	return lines;
}

function parseMermaid(source: string): {
	direction: Direction;
	caption: string;
	nodes: Map<string, NodeDef>;
	edges: EdgeDef[];
	subgraphs: SubgraphDef[];
} {
	const nodes = new Map<string, NodeDef>();
	const edges: EdgeDef[] = [];
	const subgraphs: SubgraphDef[] = [];
	let direction: Direction = 'TD';
	let caption = 'Diagram';
	const stack: SubgraphDef[] = [];

	const captionMatch = source.match(/%%\s*caption:\s*(.+)/i);
	if (captionMatch) caption = captionMatch[1].trim();

	for (const statement of splitStatements(source)) {
		const header = statement.match(/^(?:flowchart|graph)\s+(LR|RL|TD|TB|BT)$/i);
		if (header) {
			direction = header[1].toUpperCase() as Direction;
			continue;
		}

		const open = statement.match(/^subgraph\s+(?:(\S+)\s*\[([^\]]+)\]|(\S+)|(.+))$/i);
		if (open) {
			const id = (open[1] ?? open[3] ?? open[4] ?? `cluster-${subgraphs.length}`).replaceAll(/\s+/g, '-');
			const title = (open[2] ?? open[4] ?? open[3] ?? id).trim();
			const cluster: SubgraphDef = { id, title, nodes: [] };
			subgraphs.push(cluster);
			stack.push(cluster);
			continue;
		}

		if (/^end$/i.test(statement)) {
			stack.pop();
			continue;
		}

		if (/^(classDef|class|style|linkStyle|click)\b/i.test(statement)) continue;

		const current = stack.at(-1);
		const chunks = statement.split(/\s*(-->|---|-.->)\s*/);
		if (chunks.length === 1) {
			const token = parseToken(chunks[0]);
			ensureNode(nodes, token.id, token.deco, current?.id);
			current?.nodes.push(token.id);
			continue;
		}

		for (let i = 0; i < chunks.length; i += 2) {
			let leftRaw = chunks[i].trim();
			let edgeLabel: string | undefined;
			const labeled = leftRaw.match(/^\|([^|]+)\|(.*)$/);
			if (labeled && i > 0) {
				edgeLabel = labeled[1].trim();
				leftRaw = labeled[2].trim();
			}
			const midLabel = leftRaw.match(/^(.*?)\s+\|([^|]+)\|$/);
			if (midLabel && i < chunks.length - 1) {
				leftRaw = midLabel[1].trim();
				edgeLabel = midLabel[2].trim();
			}

			if (!leftRaw) continue;
			const left = parseToken(leftRaw);
			ensureNode(nodes, left.id, left.deco, current?.id);
			if (current && !current.nodes.includes(left.id)) current.nodes.push(left.id);

			if (i + 2 >= chunks.length) continue;
			let rightRaw = chunks[i + 2].trim();
			const rightLabel = rightRaw.match(/^\|([^|]+)\|\s*(.+)$/);
			if (rightLabel) {
				edgeLabel = rightLabel[1].trim();
				rightRaw = rightLabel[2].trim();
			}
			const right = parseToken(rightRaw);
			ensureNode(nodes, right.id, right.deco, current?.id);
			if (current && !current.nodes.includes(right.id)) current.nodes.push(right.id);
			edges.push({ from: left.id, to: right.id, label: edgeLabel });
			chunks[i + 2] = rightRaw;
		}
	}

	if (nodes.size === 0) {
		throw new Error('Mermaid diagram has no nodes');
	}

	return { direction, caption, nodes, edges, subgraphs };
}

function rankNodes(ids: string[], edges: EdgeDef[]): Map<string, number> {
	const incoming = new Map<string, string[]>();
	const outgoing = new Map<string, string[]>();
	for (const id of ids) {
		incoming.set(id, []);
		outgoing.set(id, []);
	}
	for (const edge of edges) {
		if (!incoming.has(edge.to) || !outgoing.has(edge.from)) continue;
		incoming.get(edge.to)!.push(edge.from);
		outgoing.get(edge.from)!.push(edge.to);
	}

	const ranks = new Map<string, number>();
	const visiting = new Set<string>();

	const walk = (id: string): number => {
		const cached = ranks.get(id);
		if (cached !== undefined) return cached;
		if (visiting.has(id)) return 0;
		visiting.add(id);
		const preds = incoming.get(id) ?? [];
		const rank = preds.length === 0 ? 0 : Math.max(...preds.map((p) => walk(p) + 1));
		visiting.delete(id);
		ranks.set(id, rank);
		return rank;
	};

	for (const id of ids) walk(id);
	return ranks;
}

function connectedGroups(ids: string[], edges: EdgeDef[]): string[][] {
	const set = new Set(ids);
	const adj = new Map<string, string[]>();
	for (const id of ids) adj.set(id, []);
	for (const edge of edges) {
		if (!set.has(edge.from) || !set.has(edge.to)) continue;
		adj.get(edge.from)!.push(edge.to);
		adj.get(edge.to)!.push(edge.from);
	}
	const seen = new Set<string>();
	const groups: string[][] = [];
	for (const id of ids) {
		if (seen.has(id)) continue;
		const queue = [id];
		const group: string[] = [];
		seen.add(id);
		while (queue.length) {
			const current = queue.shift()!;
			group.push(current);
			for (const next of adj.get(current) ?? []) {
				if (seen.has(next)) continue;
				seen.add(next);
				queue.push(next);
			}
		}
		groups.push(group);
	}
	return groups;
}

interface LaidOut {
	boxes: Map<string, Box>;
	clusters: { title: string; box: Box }[];
	width: number;
	height: number;
}

function layoutGroup(
	ids: string[],
	nodes: Map<string, NodeDef>,
	edges: EdgeDef[],
	horizontal: boolean,
): { boxes: Map<string, Box>; width: number; height: number } {
	const ranks = rankNodes(ids, edges);
	const columns = new Map<number, string[]>();
	for (const id of ids) {
		const rank = ranks.get(id) ?? 0;
		const list = columns.get(rank) ?? [];
		list.push(id);
		columns.set(rank, list);
	}
	const rankKeys = [...columns.keys()].sort((a, b) => a - b);
	const sizes = new Map<string, { w: number; h: number }>();
	for (const id of ids) sizes.set(id, nodeSize(nodes.get(id)!));

	const rankThickness = rankKeys.map((rank) => {
		const list = columns.get(rank)!;
		return Math.max(...list.map((id) => (horizontal ? sizes.get(id)!.w : sizes.get(id)!.h)));
	});
	const rankBreadth = rankKeys.map((rank) => {
		const list = columns.get(rank)!;
		const total = list.reduce((sum, id) => sum + (horizontal ? sizes.get(id)!.h : sizes.get(id)!.w), 0);
		return total + NODE_GAP * Math.max(0, list.length - 1);
	});
	const maxBreadth = Math.max(...rankBreadth, 0);

	const boxes = new Map<string, Box>();
	let cursor = 0;
	for (let i = 0; i < rankKeys.length; i++) {
		const list = columns.get(rankKeys[i])!;
		const thickness = rankThickness[i];
		const breadth = rankBreadth[i];
		let cross = (maxBreadth - breadth) / 2;
		for (const id of list) {
			const size = sizes.get(id)!;
			if (horizontal) {
				boxes.set(id, {
					x: cursor + (thickness - size.w) / 2,
					y: cross,
					w: size.w,
					h: size.h,
				});
				cross += size.h + NODE_GAP;
			} else {
				boxes.set(id, {
					x: cross,
					y: cursor + (thickness - size.h) / 2,
					w: size.w,
					h: size.h,
				});
				cross += size.w + NODE_GAP;
			}
		}
		cursor += thickness + RANK_GAP;
	}

	let width = 0;
	let height = 0;
	for (const box of boxes.values()) {
		width = Math.max(width, box.x + box.w);
		height = Math.max(height, box.y + box.h);
	}
	return { boxes, width, height };
}

function shiftBoxes(boxes: Map<string, Box>, dx: number, dy: number): void {
	for (const box of boxes.values()) {
		box.x += dx;
		box.y += dy;
	}
}

function layoutDiagram(
	parsed: ReturnType<typeof parseMermaid>,
	horizontal: boolean,
): LaidOut {
	const { nodes, edges, subgraphs } = parsed;
	const placed = new Map<string, Box>();
	const clusters: { title: string; box: Box }[] = [];
	const used = new Set<string>();
	const blocks: { boxes: Map<string, Box>; cluster?: { title: string; box: Box }; width: number; height: number }[] =
		[];

	for (const subgraph of subgraphs) {
		const ids = subgraph.nodes.filter((id) => nodes.has(id));
		if (ids.length === 0) continue;
		ids.forEach((id) => used.add(id));
		const inner = layoutGroup(ids, nodes, edges, horizontal);
		const clusterBox = {
			x: 0,
			y: 0,
			w: inner.width + CLUSTER_PAD * 2,
			h: inner.height + CLUSTER_PAD * 2 + CLUSTER_TITLE,
		};
		shiftBoxes(inner.boxes, CLUSTER_PAD, CLUSTER_PAD + CLUSTER_TITLE);
		blocks.push({
			boxes: inner.boxes,
			cluster: { title: subgraph.title, box: clusterBox },
			width: clusterBox.w,
			height: clusterBox.h,
		});
	}

	const free = [...nodes.keys()].filter((id) => !used.has(id));
	if (free.length) {
		for (const group of connectedGroups(free, edges)) {
			const inner = layoutGroup(group, nodes, edges, horizontal);
			blocks.push({ boxes: inner.boxes, width: inner.width, height: inner.height });
		}
	}

	let y = 0;
	let width = 0;
	for (const block of blocks) {
		shiftBoxes(block.boxes, 0, y);
		if (block.cluster) {
			block.cluster.box.y = y;
			clusters.push(block.cluster);
		}
		for (const [id, box] of block.boxes) placed.set(id, box);
		width = Math.max(width, block.width);
		y += block.height + CLUSTER_GAP;
	}

	const height = Math.max(0, y - CLUSTER_GAP);
	return { boxes: placed, clusters, width, height };
}

function anchor(box: Box, toward: Box): { x: number; y: number } {
	const cx = box.x + box.w / 2;
	const cy = box.y + box.h / 2;
	const tx = toward.x + toward.w / 2;
	const ty = toward.y + toward.h / 2;
	const dx = tx - cx;
	const dy = ty - cy;
	if (Math.abs(dx) > Math.abs(dy)) {
		return { x: dx > 0 ? box.x + box.w : box.x, y: cy };
	}
	return { x: cx, y: dy > 0 ? box.y + box.h : box.y };
}

function drawNode(node: NodeDef, box: Box): string {
	const cx = box.x + box.w / 2;
	const cy = box.y + box.h / 2;
	const label = `<text x="${cx}" y="${cy + 1}" text-anchor="middle" dominant-baseline="middle" fill="${STROKE}" font-family="${FONT}" font-size="${FONT_SIZE}">${escapeXml(node.label)}</text>`;
	if (node.shape === 'diamond') {
		const points = [
			`${cx},${box.y}`,
			`${box.x + box.w},${cy}`,
			`${cx},${box.y + box.h}`,
			`${box.x},${cy}`,
		].join(' ');
		return `<polygon points="${points}" fill="none" stroke="${STROKE}" stroke-width="1.15"/>${label}`;
	}
	const radius = node.shape === 'round' ? 16 : 2;
	return `<rect x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="${radius}" ry="${radius}" fill="none" stroke="${STROKE}" stroke-width="1.15"/>${label}`;
}

export function renderMermaidSvg(source: string): string {
	const parsed = parseMermaid(source);
	const horizontal = parsed.direction === 'LR' || parsed.direction === 'RL';
	const laid = layoutDiagram(parsed, horizontal);

	if (parsed.direction === 'RL') {
		for (const box of laid.boxes.values()) box.x = laid.width - box.x - box.w;
		for (const cluster of laid.clusters) cluster.box.x = laid.width - cluster.box.x - cluster.box.w;
	}
	if (parsed.direction === 'BT') {
		for (const box of laid.boxes.values()) box.y = laid.height - box.y - box.h;
		for (const cluster of laid.clusters) cluster.box.y = laid.height - cluster.box.y - cluster.box.h;
	}

	const id = `m${++diagramSerial}`;
	const width = laid.width + PAGE_PAD * 2;
	const height = laid.height + PAGE_PAD * 2;
	const ox = PAGE_PAD;
	const oy = PAGE_PAD;

	const parts: string[] = [
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-label="${escapeXml(parsed.caption)}">`,
		`<defs><marker id="${id}-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 1.2 L 10 5 L 0 8.8 z" fill="${STROKE}"/></marker></defs>`,
	];

	for (const cluster of laid.clusters) {
		const box = cluster.box;
		parts.push(
			`<rect x="${box.x + ox}" y="${box.y + oy}" width="${box.w}" height="${box.h}" fill="none" stroke="${RULE}" stroke-width="1"/>`,
			`<text x="${box.x + ox + CLUSTER_PAD}" y="${box.y + oy + 14}" fill="${MUTED}" font-family="${FONT}" font-size="11">${escapeXml(cluster.title)}</text>`,
		);
	}

	for (const edge of parsed.edges) {
		const from = laid.boxes.get(edge.from);
		const to = laid.boxes.get(edge.to);
		if (!from || !to) continue;
		const a = anchor(from, to);
		const b = anchor(to, from);
		parts.push(
			`<line x1="${a.x + ox}" y1="${a.y + oy}" x2="${b.x + ox}" y2="${b.y + oy}" stroke="${STROKE}" stroke-width="1.05" marker-end="url(#${id}-arrow)"/>`,
		);
		if (edge.label) {
			const mx = (a.x + b.x) / 2 + ox;
			const my = (a.y + b.y) / 2 + oy - 7;
			parts.push(
				`<text x="${mx}" y="${my}" text-anchor="middle" fill="${MUTED}" font-family="${FONT}" font-size="11">${escapeXml(edge.label)}</text>`,
			);
		}
	}

	for (const node of parsed.nodes.values()) {
		const box = laid.boxes.get(node.id);
		if (!box) continue;
		parts.push(drawNode(node, { ...box, x: box.x + ox, y: box.y + oy }));
	}

	parts.push('</svg>');
	return `<figure class="diagram">${parts.join('')}</figure>`;
}
