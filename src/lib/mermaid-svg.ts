type Direction = 'LR' | 'RL' | 'TD' | 'TB' | 'BT';
type Shape = 'rect' | 'round' | 'diamond';
type Side = 'left' | 'right' | 'top' | 'bottom';

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
	dashed: boolean;
}

interface SubgraphDef {
	id: string;
	title: string;
	nodes: string[];
}

export interface Box {
	x: number;
	y: number;
	w: number;
	h: number;
}

export interface Point {
	x: number;
	y: number;
}

export interface Segment {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
	dashed: boolean;
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
const CLEARANCE = 6;
const ROUTE_MARGIN = 18;
const TURN_COST = 14;

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
			const op = chunks[i + 1];
			edges.push({ from: left.id, to: right.id, label: edgeLabel, dashed: op === '-.->' });
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

function titleBox(cluster: { box: Box }): Box {
	return { x: cluster.box.x, y: cluster.box.y, w: cluster.box.w, h: CLUSTER_TITLE };
}

function inflate(box: Box, pad: number): Box {
	return { x: box.x - pad, y: box.y - pad, w: box.w + pad * 2, h: box.h + pad * 2 };
}

export function segmentHitsBox(
	x1: number,
	y1: number,
	x2: number,
	y2: number,
	box: Box,
	inset = 0,
): boolean {
	const left = box.x + inset;
	const top = box.y + inset;
	const right = box.x + box.w - inset;
	const bottom = box.y + box.h - inset;
	if (right <= left || bottom <= top) return false;
	const minX = Math.min(x1, x2);
	const maxX = Math.max(x1, x2);
	const minY = Math.min(y1, y2);
	const maxY = Math.max(y1, y2);
	return maxX > left && minX < right && maxY > top && minY < bottom;
}

function fmt(value: number): string {
	return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '');
}

function drawNode(node: NodeDef, box: Box): string {
	const cx = box.x + box.w / 2;
	const cy = box.y + box.h / 2;
	const label = `<text x="${fmt(cx)}" y="${fmt(cy + 1)}" text-anchor="middle" dominant-baseline="middle" fill="${STROKE}" font-family="${FONT}" font-size="${FONT_SIZE}">${escapeXml(node.label)}</text>`;
	if (node.shape === 'diamond') {
		const points = [
			`${fmt(cx)},${fmt(box.y)}`,
			`${fmt(box.x + box.w)},${fmt(cy)}`,
			`${fmt(cx)},${fmt(box.y + box.h)}`,
			`${fmt(box.x)},${fmt(cy)}`,
		].join(' ');
		return `<polygon points="${points}" fill="none" stroke="${STROKE}" stroke-width="1.15"/>${label}`;
	}
	const radius = node.shape === 'round' ? 16 : 2;
	return `<rect x="${fmt(box.x)}" y="${fmt(box.y)}" width="${fmt(box.w)}" height="${fmt(box.h)}" rx="${radius}" ry="${radius}" fill="none" stroke="${STROKE}" stroke-width="1.15"/>${label}`;
}

function port(box: Box, side: Side): Point {
	const cx = box.x + box.w / 2;
	const cy = box.y + box.h / 2;
	if (side === 'left') return { x: box.x, y: cy };
	if (side === 'right') return { x: box.x + box.w, y: cy };
	if (side === 'top') return { x: cx, y: box.y };
	return { x: cx, y: box.y + box.h };
}

function outward(box: Box, side: Side, dist: number): Point {
	const p = port(box, side);
	if (side === 'left') return { x: p.x - dist, y: p.y };
	if (side === 'right') return { x: p.x + dist, y: p.y };
	if (side === 'top') return { x: p.x, y: p.y - dist };
	return { x: p.x, y: p.y + dist };
}

function facingSide(from: Box, to: Box): Side {
	const cx = from.x + from.w / 2;
	const cy = from.y + from.h / 2;
	const tx = to.x + to.w / 2;
	const ty = to.y + to.h / 2;
	const dx = tx - cx;
	const dy = ty - cy;
	if (Math.abs(dx) > Math.abs(dy)) return dx > 0 ? 'right' : 'left';
	return dy > 0 ? 'bottom' : 'top';
}

function opposite(side: Side): Side {
	if (side === 'left') return 'right';
	if (side === 'right') return 'left';
	if (side === 'top') return 'bottom';
	return 'top';
}

function uniqueSorted(values: number[]): number[] {
	const rounded = values.map((value) => Math.round(value * 100) / 100);
	return [...new Set(rounded)].sort((a, b) => a - b);
}

function pointKey(point: Point): string {
	return `${point.x},${point.y}`;
}

function collinear(a: Point, b: Point, c: Point): boolean {
	return (a.x === b.x && b.x === c.x) || (a.y === b.y && b.y === c.y);
}

function simplifyPath(points: Point[]): Point[] {
	const out: Point[] = [];
	for (const point of points) {
		const prev = out.at(-1);
		if (prev && prev.x === point.x && prev.y === point.y) continue;
		out.push(point);
		while (out.length >= 3 && collinear(out[out.length - 3], out[out.length - 2], out[out.length - 1])) {
			out.splice(out.length - 2, 1);
		}
	}
	return out;
}

function pathLength(points: Point[]): number {
	let length = 0;
	for (let i = 1; i < points.length; i++) {
		length += Math.abs(points[i].x - points[i - 1].x) + Math.abs(points[i].y - points[i - 1].y);
	}
	return length;
}

function blockedSegment(a: Point, b: Point, obstacles: Box[]): boolean {
	if (a.x !== b.x && a.y !== b.y) return true;
	for (const box of obstacles) {
		if (segmentHitsBox(a.x, a.y, b.x, b.y, box)) return true;
	}
	return false;
}

function tryLPath(start: Point, end: Point, obstacles: Box[]): Point[] | null {
	if (start.x === end.x || start.y === end.y) {
		if (!blockedSegment(start, end, obstacles)) return [start, end];
		return null;
	}
	const elbowA = { x: end.x, y: start.y };
	if (!blockedSegment(start, elbowA, obstacles) && !blockedSegment(elbowA, end, obstacles)) {
		return [start, elbowA, end];
	}
	const elbowB = { x: start.x, y: end.y };
	if (!blockedSegment(start, elbowB, obstacles) && !blockedSegment(elbowB, end, obstacles)) {
		return [start, elbowB, end];
	}
	return null;
}

function gridPath(start: Point, end: Point, obstacles: Box[], bounds: Box): Point[] | null {
	const xs = uniqueSorted([
		bounds.x,
		bounds.x + bounds.w,
		start.x,
		end.x,
		...obstacles.flatMap((box) => [box.x, box.x + box.w, box.x - 1, box.x + box.w + 1]),
	]);
	const ys = uniqueSorted([
		bounds.y,
		bounds.y + bounds.h,
		start.y,
		end.y,
		...obstacles.flatMap((box) => [box.y, box.y + box.h, box.y - 1, box.y + box.h + 1]),
	]);

	const xIndex = new Map(xs.map((value, i) => [value, i]));
	const yIndex = new Map(ys.map((value, i) => [value, i]));
	if (!xIndex.has(start.x) || !yIndex.has(start.y) || !xIndex.has(end.x) || !yIndex.has(end.y)) {
		return null;
	}

	const startState = `${xIndex.get(start.x)},${yIndex.get(start.y)},-1`;
	const goal = `${xIndex.get(end.x)},${yIndex.get(end.y)}`;
	const dist = new Map<string, number>();
	const prev = new Map<string, { key: string; point: Point }>();
	const heap: { key: string; i: number; j: number; dir: number; cost: number }[] = [];

	dist.set(startState, 0);
	heap.push({ key: startState, i: xIndex.get(start.x)!, j: yIndex.get(start.y)!, dir: -1, cost: 0 });

	const pop = (): (typeof heap)[number] | undefined => {
		if (heap.length === 0) return undefined;
		let best = 0;
		for (let i = 1; i < heap.length; i++) {
			if (heap[i].cost < heap[best].cost) best = i;
		}
		return heap.splice(best, 1)[0];
	};

	const deltas = [
		{ di: 1, dj: 0, dir: 0 },
		{ di: -1, dj: 0, dir: 1 },
		{ di: 0, dj: 1, dir: 2 },
		{ di: 0, dj: -1, dir: 3 },
	];

	while (heap.length) {
		const current = pop()!;
		if (current.cost !== dist.get(current.key)) continue;
		if (`${current.i},${current.j}` === goal) {
			const points: Point[] = [{ x: xs[current.i], y: ys[current.j] }];
			let cursor = current.key;
			while (cursor !== startState) {
				const step = prev.get(cursor);
				if (!step) break;
				points.push(step.point);
				cursor = step.key;
			}
			points.reverse();
			return points;
		}

		for (const delta of deltas) {
			const ni = current.i + delta.di;
			const nj = current.j + delta.dj;
			if (ni < 0 || nj < 0 || ni >= xs.length || nj >= ys.length) continue;
			const from = { x: xs[current.i], y: ys[current.j] };
			const to = { x: xs[ni], y: ys[nj] };
			if (blockedSegment(from, to, obstacles)) continue;
			const step = Math.abs(to.x - from.x) + Math.abs(to.y - from.y);
			const turn = current.dir !== -1 && current.dir !== delta.dir ? TURN_COST : 0;
			const nextCost = current.cost + step + turn;
			const nextKey = `${ni},${nj},${delta.dir}`;
			const best = dist.get(nextKey);
			if (best !== undefined && best <= nextCost) continue;
			dist.set(nextKey, nextCost);
			prev.set(nextKey, { key: current.key, point: from });
			heap.push({ key: nextKey, i: ni, j: nj, dir: delta.dir, cost: nextCost });
		}
	}

	return null;
}

function aroundBounds(start: Point, end: Point, bounds: Box): Point[] {
	const top = [
		start,
		{ x: start.x, y: bounds.y },
		{ x: end.x, y: bounds.y },
		end,
	];
	const bottom = [
		start,
		{ x: start.x, y: bounds.y + bounds.h },
		{ x: end.x, y: bounds.y + bounds.h },
		end,
	];
	const left = [
		start,
		{ x: bounds.x, y: start.y },
		{ x: bounds.x, y: end.y },
		end,
	];
	const right = [
		start,
		{ x: bounds.x + bounds.w, y: start.y },
		{ x: bounds.x + bounds.w, y: end.y },
		end,
	];
	return [top, bottom, left, right].sort((a, b) => pathLength(a) - pathLength(b))[0];
}

const SIDES: Side[] = ['right', 'left', 'bottom', 'top'];

function routeEdge(from: Box, to: Box, obstacles: Box[], bounds: Box): Point[] {
	const inflated = obstacles.map((box) => inflate(box, CLEARANCE));
	const preferred: [Side, Side][] = [
		[facingSide(from, to), facingSide(to, from)],
		[facingSide(from, to), opposite(facingSide(from, to))],
		[opposite(facingSide(to, from)), facingSide(to, from)],
	];
	const pairs: [Side, Side][] = [];
	const seen = new Set<string>();
	for (const pair of [...preferred, ...SIDES.flatMap((a) => SIDES.map((b) => [a, b] as [Side, Side]))]) {
		const key = `${pair[0]}-${pair[1]}`;
		if (seen.has(key)) continue;
		seen.add(key);
		pairs.push(pair);
	}

	let best: Point[] | null = null;
	let bestScore = Infinity;

	for (let pairIndex = 0; pairIndex < pairs.length; pairIndex++) {
		const [fromSide, toSide] = pairs[pairIndex];
		const start = outward(from, fromSide, CLEARANCE);
		const end = outward(to, toSide, CLEARANCE);
		let mid = tryLPath(start, end, inflated);
		if (!mid) mid = gridPath(start, end, inflated, bounds);
		if (!mid) continue;
		const path = simplifyPath([port(from, fromSide), ...mid, port(to, toSide)]);
		const bends = Math.max(0, path.length - 2);
		const score = bends * 1000 + pathLength(path) + pairIndex * 0.01;
		if (score < bestScore) {
			best = path;
			bestScore = score;
		}
	}

	if (best) return best;

	const fromSide = facingSide(from, to);
	const toSide = facingSide(to, from);
	return simplifyPath([
		port(from, fromSide),
		...aroundBounds(outward(from, fromSide, CLEARANCE), outward(to, toSide, CLEARANCE), bounds),
		port(to, toSide),
	]);
}

function longestMidpoint(points: Point[]): { x: number; y: number; horizontal: boolean } {
	let best = 0;
	let from = points[0];
	let to = points.at(-1) ?? points[0];
	for (let i = 1; i < points.length; i++) {
		const length = Math.abs(points[i].x - points[i - 1].x) + Math.abs(points[i].y - points[i - 1].y);
		if (length > best) {
			best = length;
			from = points[i - 1];
			to = points[i];
		}
	}
	return {
		x: (from.x + to.x) / 2,
		y: (from.y + to.y) / 2,
		horizontal: from.y === to.y,
	};
}

export interface MermaidInspect {
	caption: string;
	nodeBoxes: Box[];
	titleBoxes: Box[];
	segments: Segment[];
	svg: string;
}

function layoutAndRoute(source: string): {
	parsed: ReturnType<typeof parseMermaid>;
	laid: LaidOut;
	titleBoxes: Box[];
	routes: { edge: EdgeDef; points: Point[] }[];
} {
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

	const titleBoxes = laid.clusters.map(titleBox);
	const bounds: Box = {
		x: -ROUTE_MARGIN,
		y: -ROUTE_MARGIN,
		w: laid.width + ROUTE_MARGIN * 2,
		h: laid.height + ROUTE_MARGIN * 2,
	};
	const routes: { edge: EdgeDef; points: Point[] }[] = [];
	for (const edge of parsed.edges) {
		const from = laid.boxes.get(edge.from);
		const to = laid.boxes.get(edge.to);
		if (!from || !to) continue;
		const obstacles = [...laid.boxes.values(), ...titleBoxes];
		routes.push({ edge, points: routeEdge(from, to, obstacles, bounds) });
	}

	return { parsed, laid, titleBoxes, routes };
}

export function inspectMermaidDiagram(source: string): MermaidInspect {
	const { parsed, laid, titleBoxes, routes } = layoutAndRoute(source);

	let minX = 0;
	let minY = 0;
	let maxX = laid.width;
	let maxY = laid.height;
	for (const cluster of laid.clusters) {
		minX = Math.min(minX, cluster.box.x);
		minY = Math.min(minY, cluster.box.y);
		maxX = Math.max(maxX, cluster.box.x + cluster.box.w);
		maxY = Math.max(maxY, cluster.box.y + cluster.box.h);
	}
	for (const box of laid.boxes.values()) {
		minX = Math.min(minX, box.x);
		minY = Math.min(minY, box.y);
		maxX = Math.max(maxX, box.x + box.w);
		maxY = Math.max(maxY, box.y + box.h);
	}
	for (const route of routes) {
		for (const point of route.points) {
			minX = Math.min(minX, point.x);
			minY = Math.min(minY, point.y);
			maxX = Math.max(maxX, point.x);
			maxY = Math.max(maxY, point.y);
		}
	}

	const ox = PAGE_PAD - minX;
	const oy = PAGE_PAD - minY;
	const width = maxX - minX + PAGE_PAD * 2;
	const height = maxY - minY + PAGE_PAD * 2;
	const id = `m${++diagramSerial}`;

	const parts: string[] = [
		`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fmt(width)} ${fmt(height)}" width="${fmt(width)}" height="${fmt(height)}" role="img" aria-label="${escapeXml(parsed.caption)}">`,
		`<defs><marker id="${id}-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 1.2 L 10 5 L 0 8.8 z" fill="${STROKE}"/></marker></defs>`,
	];

	for (const cluster of laid.clusters) {
		const box = cluster.box;
		parts.push(
			`<rect x="${fmt(box.x + ox)}" y="${fmt(box.y + oy)}" width="${fmt(box.w)}" height="${fmt(box.h)}" fill="none" stroke="${RULE}" stroke-width="1"/>`,
			`<text x="${fmt(box.x + ox + CLUSTER_PAD)}" y="${fmt(box.y + oy + 14)}" fill="${MUTED}" font-family="${FONT}" font-size="11">${escapeXml(cluster.title)}</text>`,
		);
	}

	const segments: Segment[] = [];
	for (const route of routes) {
		const points = route.points.map((point) => ({ x: point.x + ox, y: point.y + oy }));
		for (let i = 1; i < points.length; i++) {
			segments.push({
				x1: points[i - 1].x,
				y1: points[i - 1].y,
				x2: points[i].x,
				y2: points[i].y,
				dashed: route.edge.dashed,
			});
		}
		const pointAttr = points.map((point) => `${fmt(point.x)},${fmt(point.y)}`).join(' ');
		const dash = route.edge.dashed ? ' stroke-dasharray="5 4"' : '';
		parts.push(
			`<polyline points="${pointAttr}" fill="none" stroke="${STROKE}" stroke-width="1.05"${dash} marker-end="url(#${id}-arrow)"/>`,
		);
		if (route.edge.label) {
			const mid = longestMidpoint(points);
			const x = mid.horizontal ? mid.x : mid.x + 8;
			const y = mid.horizontal ? mid.y - 7 : mid.y;
			const anchor = mid.horizontal ? 'middle' : 'start';
			parts.push(
				`<text x="${fmt(x)}" y="${fmt(y)}" text-anchor="${anchor}" fill="${MUTED}" font-family="${FONT}" font-size="11">${escapeXml(route.edge.label)}</text>`,
			);
		}
	}

	for (const node of parsed.nodes.values()) {
		const box = laid.boxes.get(node.id);
		if (!box) continue;
		parts.push(drawNode(node, { ...box, x: box.x + ox, y: box.y + oy }));
	}

	parts.push('</svg>');

	return {
		caption: parsed.caption,
		nodeBoxes: [...laid.boxes.values()].map((box) => ({ ...box, x: box.x + ox, y: box.y + oy })),
		titleBoxes: titleBoxes.map((box) => ({ ...box, x: box.x + ox, y: box.y + oy })),
		segments,
		svg: parts.join(''),
	};
}

export function renderMermaidSvg(source: string): string {
	return `<figure class="diagram">${inspectMermaidDiagram(source).svg}</figure>`;
}
