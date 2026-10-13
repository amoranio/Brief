import { getPosts, isoDate } from '../lib/collection';
import { frameworkRefs } from '../lib/frameworks';

function plain(body: string): string {
	return body
		.replace(/```[\s\S]*?```/g, ' ')
		.replace(/`([^`]*)`/g, '$1')
		.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replace(/[#*_>]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

export async function GET() {
	const posts = await getPosts();
	const index = posts.map((post) => {
		const refs = frameworkRefs(post);
		return {
			slug: post.id,
			title: post.data.title,
			dek: post.data.dek,
			date: isoDate(post.data.date),
			tags: post.data.tags,
			ids: refs.map((r) => r.id),
			names: refs.map((r) => r.name),
			text: plain(post.body ?? ''),
		};
	});
	return new Response(JSON.stringify(index), {
		headers: { 'Content-Type': 'application/json; charset=utf-8' },
	});
}
