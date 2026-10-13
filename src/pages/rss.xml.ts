import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getPosts } from '../lib/collection';

export async function GET(context: APIContext) {
	const posts = await getPosts();

	return rss({
		title: 'Brief',
		description: 'A library of attacks on AI systems, mapped to MITRE ATLAS, MITRE ATT&CK, and OWASP.',
		site: context.site!,
		items: posts.map((post) => ({
			title: post.data.title,
			description: post.data.dek,
			pubDate: post.data.date,
			link: `/${post.id}/`,
		})),
		customData: `<language>en-gb</language>`,
	});
}
