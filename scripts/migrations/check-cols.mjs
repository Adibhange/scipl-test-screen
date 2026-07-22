import "dotenv/config";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
	const specUrl = `${url}/rest/v1/`;
	const response = await fetch(specUrl, {
		headers: {
			apikey: serviceRoleKey,
		},
	});

	const spec = await response.json();
	console.log("Spec root keys:", Object.keys(spec));
	if (spec.definitions) {
		console.log("Candidate definitions keys:", Object.keys(spec.definitions).filter(k => k.includes("candidate")));
		console.log("candidate_experiences definition details:", JSON.stringify(spec.definitions.candidate_experiences, null, 2));
	}
}

main().catch(console.error);
