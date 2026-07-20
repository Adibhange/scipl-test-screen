import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Candidate } from "@/types"

let client: SupabaseClient | undefined

/**
 * Server-only Supabase client. Route handlers use the service-role key so
 * database writes are not dependent on browser-facing RLS policies.
 */
export function getSupabaseServerClient(): SupabaseClient {
  if (client) return client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server.",
    )
  }

  client = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return client
}

export type CandidateInput = {
  firstName: string
  lastName: string
  mobile: string
  email: string
  role: string
  experience: string
  testLocation?: string
  hiringLocation?: string
  hiringStatus?: Candidate["hiringStatus"]
  expectedSalary?: number
  offerSalary?: number
  hrNotes?: string
  vacancyId?: string
}

export type CandidateRecord = Omit<CandidateInput, 'firstName' | 'lastName'> & {
  id: string
  firstName: string
  lastName: string
  vacancyTitle?: string
  created_at: string
}

export async function createCandidate(input: CandidateInput): Promise<CandidateRecord> {
  const supabase = getSupabaseServerClient();

  // Resolve string values to UUIDs from master tables
  const { data: roleData } = await supabase.from("master_roles").select("id").eq("value", input.role).maybeSingle();
  const { data: expData } = await supabase.from("master_experiences").select("id").eq("value", input.experience).maybeSingle();
  const { data: testData } = await supabase.from("master_test_locations").select("id").eq("value", input.testLocation || "home").maybeSingle();

  let hiringLocId: string | null = null;
  if (input.hiringLocation) {
    const { data: hiringData } = await supabase.from("master_hiring_locations").select("id").eq("value", input.hiringLocation).maybeSingle();
    hiringLocId = hiringData?.id || null;
  }

  const roleId = roleData?.id;
  const expId = expData?.id;
  const testLocId = testData?.id;

  if (!roleId || !expId || !testLocId) {
    throw new Error(`Invalid pre-registration choices: role=${input.role}, exp=${input.experience}, testLoc=${input.testLocation}`);
  }

  const { data, error } = await supabase
    .from("candidates")
    .insert({
      first_name: input.firstName,
      last_name: input.lastName,
      mobile: input.mobile,
      email: input.email,
      role: roleId,
      experience: expId,
      test_location: testLocId,
      hiring_location: hiringLocId,
      hiring_status: input.hiringStatus ?? "screening",
      expected_salary: input.expectedSalary ?? null,
      offer_salary: input.offerSalary ?? null,
      hr_notes: input.hrNotes ?? null,
      vacancy_id: input.vacancyId || null,
    })
    .select(`
      id, first_name, last_name, mobile, email, hiring_status, expected_salary, offer_salary, hr_notes, vacancy_id, created_at,
      hiringLocObj:master_hiring_locations(value)
    `)
    .single()

  if (error) throw new Error(`Could not save candidate: ${error.message}`)

  const hiringLocVal = (data as any).hiringLocObj?.value || undefined;

  return {
    id: String(data.id),
    firstName: String(data.first_name),
    lastName: String(data.last_name),
    mobile: String(data.mobile),
    email: String(data.email),
    role: input.role,
    experience: input.experience,
    testLocation: input.testLocation ?? "home",
    hiringLocation: hiringLocVal,
    hiringStatus: (data.hiring_status as any) ?? "screening",
    expectedSalary: data.expected_salary == null ? undefined : Number(data.expected_salary),
    offerSalary: data.offer_salary == null ? undefined : Number(data.offer_salary),
    hrNotes: (data.hr_notes as string | null) ?? undefined,
    vacancyId: data.vacancy_id || undefined,
    created_at: String(data.created_at),
  }
}

export async function getCandidateById(id: string): Promise<CandidateRecord | null> {
  const { data, error } = await getSupabaseServerClient()
    .from("candidates")
    .select(`
      id, first_name, last_name, mobile, email, hiring_status, expected_salary, offer_salary, hr_notes, created_at, vacancy_id,
      roleObj:master_roles(value),
      experienceObj:master_experiences(value),
      testLocObj:master_test_locations(value),
      hiringLocObj:master_hiring_locations(value),
      vacancyObj:job_vacancies(
        id,
        roleObj:master_roles(value, label),
        experienceObj:master_experiences(value, label),
        hiringLocObj:master_hiring_locations(value, label)
      )
    `)
    .eq("id", id)
    .maybeSingle()

  if (error) throw new Error(`Could not load candidate: ${error.message}`)
  if (!data) return null

  const roleVal = (data as any).roleObj?.value || "";
  const expVal = (data as any).experienceObj?.value || "";
  const testLocVal = (data as any).testLocObj?.value || "home";
  const hiringLocVal = (data as any).hiringLocObj?.value || undefined;

  const vacancyVal = (data as any).vacancyObj;
  let vacancyTitleVal: string | undefined = undefined;
  if (vacancyVal) {
    const rLabel = vacancyVal.roleObj?.label || "";
    const eLabel = vacancyVal.experienceObj?.label || "";
    const hLabel = vacancyVal.hiringLocObj?.label || "";
    vacancyTitleVal = `${rLabel} (${eLabel}) - ${hLabel}`;
  }

  return {
    id: String(data.id),
    firstName: String(data.first_name),
    lastName: String(data.last_name),
    mobile: String(data.mobile),
    email: String(data.email),
    role: roleVal,
    experience: expVal,
    testLocation: testLocVal,
    hiringLocation: hiringLocVal,
    hiringStatus: (data.hiring_status as any) ?? "screening",
    expectedSalary: data.expected_salary == null ? undefined : Number(data.expected_salary),
    offerSalary: data.offer_salary == null ? undefined : Number(data.offer_salary),
    hrNotes: (data.hr_notes as string | null) ?? undefined,
    vacancyId: data.vacancy_id || undefined,
    vacancyTitle: vacancyTitleVal,
    created_at: String(data.created_at),
  }
}
