import type { Post } from './collection';

export type FrameworkKey = 'atlas' | 'attack' | 'owaspLlm' | 'owaspAgentic';

export const frameworkLabels: Record<FrameworkKey, string> = {
	atlas: 'MITRE ATLAS',
	attack: 'MITRE ATT&CK',
	owaspLlm: 'OWASP Top 10 for LLM Applications',
	owaspAgentic: 'OWASP Top 10 for Agentic Applications',
};

export const frameworkOrder: FrameworkKey[] = ['atlas', 'attack', 'owaspLlm', 'owaspAgentic'];

const names: Record<string, string> = {
	// MITRE ATLAS
	'AML.T0010': 'AI Supply Chain Compromise',
	'AML.T0010.001': 'AI Software',
	'AML.T0010.005': 'AI Agent Tool',
	'AML.T0011': 'User Execution',
	'AML.T0011.002': 'Poisoned AI Agent Tool',
	'AML.T0012': 'Valid Accounts',
	'AML.T0018': 'Manipulate AI Model',
	'AML.T0020': 'Poison Training Data',
	'AML.T0034': 'Cost Harvesting',
	'AML.T0034.002': 'Agentic Resource Consumption',
	'AML.T0024': 'Exfiltration via AI Inference API',
	'AML.T0024.002': 'Extract AI Model',
	'AML.T0029': 'Denial of AI Service',
	'AML.T0051': 'LLM Prompt Injection',
	'AML.T0051.000': 'Direct',
	'AML.T0051.001': 'Indirect',
	'AML.T0053': 'AI Agent Tool Invocation',
	'AML.T0054': 'LLM Jailbreak',
	'AML.T0056': 'Extract LLM System Prompt',
	'AML.T0057': 'LLM Data Leakage',
	'AML.T0065': 'LLM Prompt Crafting',
	'AML.T0066': 'Retrieval Content Crafting',
	'AML.T0067': 'LLM Trusted Output Components Manipulation',
	'AML.T0068': 'LLM Prompt Obfuscation',
	'AML.T0070': 'RAG Poisoning',
	'AML.T0077': 'LLM Response Rendering',
	'AML.T0080': 'AI Agent Context Poisoning',
	'AML.T0080.000': 'Memory',
	'AML.T0081': 'Modify AI Agent Configuration',
	'AML.T0086': 'Exfiltration via AI Agent Tool Invocation',
	'AML.T0091': 'Use Alternate Authentication Material',
	'AML.T0091.000': 'Application Access Token',
	'AML.T0099': 'AI Agent Tool Data Poisoning',
	'AML.T0104': 'Publish Poisoned AI Agent Tool',
	'AML.T0109': 'AI Supply Chain Rug Pull',
	'AML.T0110': 'AI Agent Tool Poisoning',
	// MITRE ATT&CK
	'T1078': 'Valid Accounts',
	'T1195': 'Supply Chain Compromise',
	'T1195.002': 'Compromise Software Supply Chain',
	'T1204': 'User Execution',
	'T1213': 'Data from Information Repositories',
	'T1496': 'Resource Hijacking',
	'T1528': 'Steal Application Access Token',
	'T1548': 'Abuse Elevation Control Mechanism',
	'T1562': 'Impair Defenses',
	'T1567': 'Exfiltration Over Web Service',
	// OWASP LLM Top 10 (2025)
	LLM01: 'Prompt Injection',
	LLM02: 'Sensitive Information Disclosure',
	LLM03: 'Supply Chain',
	LLM04: 'Data and Model Poisoning',
	LLM05: 'Improper Output Handling',
	LLM06: 'Excessive Agency',
	LLM07: 'System Prompt Leakage',
	LLM08: 'Vector and Embedding Weaknesses',
	LLM09: 'Misinformation',
	LLM10: 'Unbounded Consumption',
	// OWASP Top 10 for Agentic Applications (2026)
	ASI01: 'Agent Goal Hijack',
	ASI02: 'Tool Misuse and Exploitation',
	ASI03: 'Identity and Privilege Abuse',
	ASI04: 'Agentic Supply Chain Vulnerabilities',
	ASI05: 'Unexpected Code Execution',
	ASI06: 'Memory and Context Poisoning',
	ASI07: 'Insecure Inter-Agent Communication',
	ASI08: 'Cascading Failures',
	ASI09: 'Human-Agent Trust Exploitation',
	ASI10: 'Rogue Agents',
};

const llmSlugs: Record<string, string> = {
	LLM01: 'llm01-prompt-injection',
	LLM02: 'llm022025-sensitive-information-disclosure',
	LLM03: 'llm032025-supply-chain',
	LLM04: 'llm042025-data-and-model-poisoning',
	LLM05: 'llm052025-improper-output-handling',
	LLM06: 'llm062025-excessive-agency',
	LLM07: 'llm072025-system-prompt-leakage',
	LLM08: 'llm082025-vector-and-embedding-weaknesses',
	LLM09: 'llm092025-misinformation',
	LLM10: 'llm102025-unbounded-consumption',
};

export function frameworkUrl(key: FrameworkKey, id: string): string {
	switch (key) {
		case 'atlas':
			return `https://atlas.mitre.org/techniques/${id}`;
		case 'attack':
			return `https://attack.mitre.org/techniques/${id.replace('.', '/')}/`;
		case 'owaspLlm':
			return `https://genai.owasp.org/llmrisk/${llmSlugs[id]}/`;
		case 'owaspAgentic':
			return 'https://genai.owasp.org/resource/owasp-top-10-for-agentic-applications-for-2026/';
	}
}

export function frameworkName(id: string): string {
	return names[id] ?? '';
}

export interface FrameworkRef {
	key: FrameworkKey;
	id: string;
	name: string;
	url: string;
}

export function frameworkRefs(post: Post): FrameworkRef[] {
	const refs: FrameworkRef[] = [];
	for (const key of frameworkOrder) {
		for (const id of [...post.data.frameworks[key]].sort()) {
			if (!names[id]) throw new Error(`${post.id}: no name registered for framework id ${id}`);
			refs.push({ key, id, name: names[id], url: frameworkUrl(key, id) });
		}
	}
	return refs;
}

export function frameworkIndex(posts: Post[]): Record<FrameworkKey, Map<string, Post[]>> {
	const out = {} as Record<FrameworkKey, Map<string, Post[]>>;
	for (const key of frameworkOrder) out[key] = new Map();
	for (const post of posts) {
		for (const ref of frameworkRefs(post)) {
			const list = out[ref.key].get(ref.id) ?? [];
			list.push(post);
			out[ref.key].set(ref.id, list);
		}
	}
	for (const key of frameworkOrder) {
		out[key] = new Map([...out[key]].sort(([a], [b]) => a.localeCompare(b)));
	}
	return out;
}
