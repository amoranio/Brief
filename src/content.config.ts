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
		frameworks: z
			.object({
				atlas: z.array(z.string().regex(/^AML\.T\d{4}(\.\d{3})?$/)).default([]),
				attack: z.array(z.string().regex(/^T\d{4}(\.\d{3})?$/)).default([]),
				owaspLlm: z.array(z.string().regex(/^LLM(0[1-9]|10)$/)).default([]),
				owaspAgentic: z.array(z.string().regex(/^ASI(0[1-9]|10)$/)).default([]),
			})
			.default({ atlas: [], attack: [], owaspLlm: [], owaspAgentic: [] }),
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
