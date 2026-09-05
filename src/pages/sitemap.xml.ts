import type { APIContext } from 'astro';
import { allTags, getPatterns, getPosts, isoDate } from '../lib/collection';

export async function GET(context: APIContext) {
	const site = context.site!;
	const posts = await getPosts();
	const patterns = await getPatterns();
	const tags = allTags(posts, patterns);

	const urls: { path: string; lastmod?: string }[] = [
		{ path: '' },
		{ path: 'about/' },
		{ path: 'archive/' },
		{ path: 'patterns/' },
		{ path: 'tags/' },
		...posts.map((post) => ({
			path: `${post.id}/`,
			lastmod: isoDate(post.data.date),
		})),
		...patterns.map((pattern) => ({
			path: `patterns/${pattern.id}/`,
			lastmod: isoDate(pattern.data.date),
		})),
		...tags.map((tag) => ({ path: `tags/${tag}/` })),
	];

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
	.map((entry) => {
		const loc = new URL(entry.path, site).href;
		const lastmod = entry.lastmod ? `\n    <lastmod>${entry.lastmod}</lastmod>` : '';
		return `  <url>\n    <loc>${loc}</loc>${lastmod}\n  </url>`;
	})
	.join('\n')}
</urlset>
`;

	return new Response(body, {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
		},
	});
}
