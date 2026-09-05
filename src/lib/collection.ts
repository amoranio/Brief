import { getCollection } from 'astro:content';
import type { CollectionEntry } from 'astro:content';

export type Post = CollectionEntry<'posts'>;
export type Pattern = CollectionEntry<'patterns'>;
export type TaggedKind = 'post' | 'pattern';

export type TaggedEntry = {
	kind: TaggedKind;
	id: string;
	href: string;
	title: string;
	dek: string;
	date: Date;
	tags: string[];
};

function byDateThenTitle<T extends { data: { date: Date; title: string } }>(a: T, b: T): number {
	const byDate = b.data.date.valueOf() - a.data.date.valueOf();
	if (byDate !== 0) return byDate;
	return a.data.title.localeCompare(b.data.title);
}

function byEntryDateThenTitle(a: TaggedEntry, b: TaggedEntry): number {
	const byDate = b.date.valueOf() - a.date.valueOf();
	if (byDate !== 0) return byDate;
	return a.title.localeCompare(b.title);
}

export async function getPosts(): Promise<Post[]> {
	return (await getCollection('posts')).sort(byDateThenTitle);
}

export async function getPatterns(): Promise<Pattern[]> {
	return (await getCollection('patterns')).sort(byDateThenTitle);
}

export function asTaggedPost(post: Post): TaggedEntry {
	return {
		kind: 'post',
		id: post.id,
		href: `/${post.id}/`,
		title: post.data.title,
		dek: post.data.dek,
		date: post.data.date,
		tags: post.data.tags,
	};
}

export function asTaggedPattern(pattern: Pattern): TaggedEntry {
	return {
		kind: 'pattern',
		id: pattern.id,
		href: `/patterns/${pattern.id}/`,
		title: pattern.data.title,
		dek: pattern.data.dek,
		date: pattern.data.date,
		tags: pattern.data.tags,
	};
}

export function taggedCatalog(posts: Post[], patterns: Pattern[]): TaggedEntry[] {
	return [...posts.map(asTaggedPost), ...patterns.map(asTaggedPattern)].sort(byEntryDateThenTitle);
}

export function allTags(posts: Post[], patterns: Pattern[] = []): string[] {
	const tags = new Set<string>();
	for (const post of posts) {
		for (const tag of post.data.tags) tags.add(tag);
	}
	for (const pattern of patterns) {
		for (const tag of pattern.data.tags) tags.add(tag);
	}
	return [...tags].sort();
}

export function postsWithTag(posts: Post[], tag: string): Post[] {
	return posts.filter((post) => post.data.tags.includes(tag));
}

export function patternsWithTag(patterns: Pattern[], tag: string): Pattern[] {
	return patterns.filter((pattern) => pattern.data.tags.includes(tag));
}

export function entriesWithTag(entries: TaggedEntry[], tag: string): TaggedEntry[] {
	return entries.filter((entry) => entry.tags.includes(tag));
}

export function isoDate(date: Date): string {
	return date.toISOString().slice(0, 10);
}
