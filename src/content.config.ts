import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const tag = z
	.string()
	.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'tags must be single words or kebab-case');

const posts = defineCollection({
	loader: glob({ base: './src/content/posts', pattern: '**/*.md' }),
	schema: z.object({
		title: z.string(),
		date: z.coerce.date(),
		dek: z.string(),
		tags: z.array(tag).min(1),
		sources: z.array(z.string().url()).default([]),
	}),
});

const patterns = defineCollection({
	loader: glob({ base: './src/content/patterns', pattern: '**/*.md' }),
	schema: z.object({
		title: z.string(),
		date: z.coerce.date(),
		dek: z.string(),
		tags: z.array(tag).default([]),
		relatedPost: z.string().min(1).optional(),
		sources: z.array(z.string().url()).default([]),
	}),
});

export const collections = { posts, patterns };
