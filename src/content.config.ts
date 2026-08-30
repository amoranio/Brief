import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const posts = defineCollection({
	loader: glob({ base: './src/content/posts', pattern: '**/*.md' }),
	schema: z.object({
		title: z.string(),
		date: z.coerce.date(),
		dek: z.string(),
		sources: z.array(z.string().url()).default([]),
	}),
});

export const collections = { posts };
