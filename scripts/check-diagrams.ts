import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	inspectMermaidDiagram,
	renderMermaidSvg,
	segmentHitsBox,
	segmentsCross,
} from '../src/lib/mermaid-svg.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const postsDir = join(root, 'src/content/posts');

const FOCUS = [
	'task-utility-is-not-harness-safety.md',
	'same-origin-is-not-a-tool-ownership-boundary.md',
	'a-hook-is-not-a-security-boundary.md',
	'deny-has-to-mean-deny.md',
	'two-allowed-actions-can-still-be-the-breach.md',
	'sandbox-on-is-not-containment.md',
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

	for (let i = 0; i < inspected.segments.length; i++) {
		for (let j = i + 1; j < inspected.segments.length; j++) {
			if (segmentsCross(inspected.segments[i], inspected.segments[j])) {
				const a = inspected.segments[i];
				const b = inspected.segments[j];
				throw new Error(
					`${label}: segments cross (${a.x1},${a.y1})-(${a.x2},${a.y2}) and (${b.x1},${b.y1})-(${b.x2},${b.y2})`,
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

function assertRecommendations(markdown: string, file: string): void {
	const match = markdown.match(/^## Recommendations\n\n((?:- .+\n)+)/m);
	if (!match) {
		throw new Error(`${file}: missing ## Recommendations with a bullet list`);
	}
	const bullets = match[1].trim().split('\n').filter((line) => line.startsWith('- '));
	if (bullets.length < 3 || bullets.length > 5) {
		throw new Error(`${file}: Recommendations must have 3–5 bullets (found ${bullets.length})`);
	}
	const after = markdown.slice(markdown.indexOf(match[0]) + match[0].length);
	if (/^## /m.test(after)) {
		throw new Error(`${file}: Recommendations must be the last heading (before Sources)`);
	}
}

const failures: string[] = [];

function check(label: string, run: () => void): void {
	try {
		run();
		console.log(`ok  ${label}`);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		failures.push(message);
		console.error(`fail ${message}`);
	}
}

check('segmentsCross: shared endpoint allowed', () => {
	if (
		segmentsCross(
			{ x1: 0, y1: 0, x2: 10, y2: 0 },
			{ x1: 10, y1: 0, x2: 10, y2: 8 },
		)
	) {
		throw new Error('shared endpoint should not count as a crossing');
	}
});

check('segmentsCross: proper crossing fails', () => {
	if (
		!segmentsCross(
			{ x1: 0, y1: 4, x2: 10, y2: 4 },
			{ x1: 5, y1: 0, x2: 5, y2: 8 },
		)
	) {
		throw new Error('interior H/V intersection should count as a crossing');
	}
});

check('segmentsCross: collinear overlap fails', () => {
	if (
		!segmentsCross(
			{ x1: 0, y1: 0, x2: 10, y2: 0 },
			{ x1: 5, y1: 0, x2: 15, y2: 0 },
		)
	) {
		throw new Error('collinear overlap should count as a crossing');
	}
});

check('segmentsCross: T-junction fails', () => {
	if (
		!segmentsCross(
			{ x1: 0, y1: 0, x2: 10, y2: 0 },
			{ x1: 5, y1: 0, x2: 5, y2: 8 },
		)
	) {
		throw new Error('T-junction should count as a crossing');
	}
});

const postFiles = readdirSync(postsDir).filter((file) => file.endsWith('.md')).sort();

for (const file of postFiles) {
	const markdown = readFileSync(join(postsDir, file), 'utf8');
	check(`${file}:recommendations`, () => assertRecommendations(markdown, file));
	const blocks = extractMermaid(markdown);
	blocks.forEach((source, index) => {
		const label = `${file}#${index + 1}`;
		check(label, () => assertOrthogonal(source, label));
	});
}

const skip = `flowchart LR
  a[Config] --> b[Extension]
  b --> c[Runtime]
  c --> d[Action]
  det[Detect] -.-> d
`;

check('synthetic-skip', () => assertOrthogonal(skip, 'synthetic-skip'));

if (FOCUS.some((file) => !postFiles.includes(file))) {
	failures.push('missing one of the focused live posts');
}

if (failures.length) {
	console.error(`\n${failures.length} diagram check(s) failed`);
	process.exit(1);
}

console.log('\nall diagram checks passed');
