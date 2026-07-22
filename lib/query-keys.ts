export const queryKeys = {
	candidates: {
		all: ["candidates"] as const,
		detail: (id: string) => ["candidates", "detail", id] as const,
		metadata: () => ["candidates", "metadata"] as const,
	},
	results: {
		all: ["results"] as const,
		detail: (id: string) => ["results", "detail", id] as const,
	},
	questions: {
		all: ["questions"] as const,
		byIds: (ids: string[]) => ["questions", "byIds", ids] as const,
	},
	admin: {
		staff: () => ["admin", "staff"] as const,
		config: () => ["admin", "config"] as const,
	},
};
