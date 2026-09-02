import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { inspectMermaidDiagram, renderMermaidSvg, segmentHitsBox } from '../src/lib/mermaid-svg.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const postsDir = join(root, 'src/content/posts');

const FOCUS = [
	'task-utility-is-not-harness-safety.md',
	'same-origin-is-not-a-tool-ownership-boundary.md',
	'a-hook-is-not-a-security-boundary.md',
	'deny-has-to-mean-deny.md',
	'two-allowed-actions-can-still-be-the-breach.md',
];

const INSET = 1;

function extractMermaid(markdown: string): string[] {
	const blocks: string[] = [];
	const re = /```mermaid\n([\s\S]*?)```/g;
	let match: RegExpExecArray | null;
	while ((match = re.exec(markdown))) blocks.push(match[1].trim());
	return blocks;
}

function assertOrthogonal(source: string, label: string): void {
	const inspected = inspectMermaidDiagram(source);
	const html = renderMermaidSvg(source);
	if (!html.startsWith('<figure class="diagram">') || !html.endsWith('</figure>')) {
		throw new Error(`${label}: missing figure.diagram wrapper`);
	}
	if (!html.includes('stroke="#111111"')) {
		throw new Error(`${label}: missing stroke #111111`);
	}

	const boxes = [...inspected.nodeBoxes, ...inspected.titleBoxes];
	if (inspected.segments.length === 0) {
		throw new Error(`${label}: expected routed segments`);
	}

	for (const seg of inspected.segments) {
		if (seg.x1 !== seg.x2 && seg.y1 !== seg.y2) {
			throw new Error(
				`${label}: non-orthogonal segment (${seg.x1},${seg.y1})-(${seg.x2},${seg.y2})`,
			);
		}
		for (const box of boxes) {
			if (segmentHitsBox(seg.x1, seg.y1, seg.x2, seg.y2, box, INSET)) {
				throw new Error(
					`${label}: segment (${seg.x1},${seg.y1})-(${seg.x2},${seg.y2}) intersects box ${JSON.stringify(box)}`,
				);
			}
		}
	}

	if (source.includes('-.->') && !inspected.segments.some((seg) => seg.dashed)) {
		throw new Error(`${label}: expected dashed edge for -.->`);
	}
	if (source.includes('%% caption:') && !html.includes('aria-label="')) {
		throw new Error(`${label}: missing caption aria-label`);
	}
}

const failures: string[] = [];

for (const file of readdirSync(postsDir).sort()) {
	if (!file.endsWith('.md')) continue;
	const markdown = readFileSync(join(postsDir, file), 'utf8');
	const blocks = extractMermaid(markdown);
	if (blocks.length === 0) continue;
	blocks.forEach((source, index) => {
		const label = `${file}#${index + 1}`;
		try {
			assertOrthogonal(source, label);
			console.log(`ok  ${label}`);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			failures.push(message);
			console.error(`fail ${message}`);
		}
	});
}

const skip = `flowchart LR
  a[Config] --> b[Extension]
  b --> c[Runtime]
  c --> d[Action]
  det[Detect] -.-> d
`;

try {
	assertOrthogonal(skip, 'synthetic-skip');
	console.log('ok  synthetic-skip');
} catch (error) {
	const message = error instanceof Error ? error.message : String(error);
	failures.push(message);
	console.error(`fail ${message}`);
}

if (FOCUS.some((file) => !readdirSync(postsDir).includes(file))) {
	failures.push('missing one of the five live posts');
}

if (failures.length) {
	console.error(`\n${failures.length} diagram check(s) failed`);
	process.exit(1);
}

console.log('\nall diagram checks passed');
