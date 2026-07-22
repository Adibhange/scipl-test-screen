export type RoleCategory = "it" | "non-it";

export type RoleConfig = {
	value: string;
	label: string;
	track: string;
	category: RoleCategory;
	icon: "database" | "code" | "rocket" | "briefcase";
	accent: string;
	soft: string;
};

// Add future roles here. Set category to "non-it" to give that role the MCQ-only assessment.
export const ROLES: RoleConfig[] = [
	{
		value: "SQL Developer",
		label: "SQL Developer",
		track: "Data Track",
		category: "it",
		icon: "database",
		accent: "#4F46E5",
		soft: "#EEF2FF",
	},
	{
		value: "NextJS Developer",
		label: "NextJS Developer",
		track: "Frontend Track",
		category: "it",
		icon: "code",
		accent: "#0F172A",
		soft: "#F1F5F9",
	},
	{
		value: "Full Stack Developer",
		label: "Full Stack Developer",
		track: "Combined Track",
		category: "it",
		icon: "rocket",
		accent: "#D97706",
		soft: "#FFFBEB",
	},
	{
		value: "Project Manager",
		label: "Project Manager",
		track: "Management Track",
		category: "non-it",
		icon: "briefcase",
		accent: "#10B981",
		soft: "#EEF2FF",
	},
	{
		value: "React Native Developer",
		label: "React Native Developer",
		track: "Mobile Track",
		category: "it",
		icon: "code",
		accent: "#0F172A",
		soft: "#F1F5F9",
	},
];

function normalizeRoleString(r: string): string {
	return (r || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function getRoleConfig(role: string) {
	const norm = normalizeRoleString(role);
	return ROLES.find(
		(item) =>
			normalizeRoleString(item.value) === norm ||
			normalizeRoleString(item.label) === norm,
	);
}

export function isITRole(role: string) {
	const config = getRoleConfig(role);
	if (config) {
		return config.category === "it";
	}

	const lowercaseRole = role.toLowerCase();
	const itKeywords = [
		"developer", "engineer", "programmer", "tester", "qa", 
		"tech", "react", "node", "sql", "next", "js", "java", 
		"python", "coder", "admin", "dev", "fullstack", "frontend", "backend"
	];

	return itKeywords.some((keyword) => lowercaseRole.includes(keyword));
}
