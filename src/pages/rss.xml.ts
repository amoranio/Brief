import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
	const posts = (await getCollection('posts')).sort(
		(a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
	);

	return rss({
		title: 'Brief',
		description: 'A short publication on AI security architecture and risk.',
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
