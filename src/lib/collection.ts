import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;

export async function getPosts(): Promise<Post[]> {
	return (await getCollection('posts')).sort((a, b) => {
		const byDate = b.data.date.valueOf() - a.data.date.valueOf();
		if (byDate !== 0) return byDate;
		return a.data.title.localeCompare(b.data.title);
	});
}

export function allTags(posts: Post[]): string[] {
	const tags = new Set<string>();
	for (const post of posts) {
		for (const tag of post.data.tags) tags.add(tag);
	}
	return [...tags].sort();
}

export function postsWithTag(posts: Post[], tag: string): Post[] {
	return posts.filter((post) => post.data.tags.includes(tag));
}

export function isoDate(date: Date): string {
	return date.toISOString().slice(0, 10);
}
