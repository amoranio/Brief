import { getPatterns, getPosts, isoDate } from '../lib/collection';
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
	const patterns = await getPatterns();
	const entries = [
		...posts.map((post) => {
			const refs = frameworkRefs(post);
			return {
				href: `/${post.id}/`,
				kind: 'post',
				title: post.data.title,
				dek: post.data.dek,
				date: isoDate(post.data.date),
				tags: post.data.tags,
				ids: refs.map((r) => r.id),
				names: refs.map((r) => r.name),
				text: plain(post.body ?? ''),
			};
		}),
		...patterns.map((pattern) => ({
			href: `/patterns/${pattern.id}/`,
			kind: 'pattern',
			title: pattern.data.title,
			dek: pattern.data.dek,
			date: isoDate(pattern.data.date),
			tags: pattern.data.tags,
			ids: [] as string[],
			names: [] as string[],
			text: plain(pattern.body ?? ''),
		})),
	].sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
	return new Response(JSON.stringify(entries), {
		headers: { 'Content-Type': 'application/json; charset=utf-8' },
	});
}
