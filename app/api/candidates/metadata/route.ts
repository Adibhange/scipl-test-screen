import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    
    // Fetch master configurations from separate tables
    const { data: masterRoles } = await supabase.from("master_roles").select("value, label").eq("is_active", true);
    const { data: masterExperiences } = await supabase.from("master_experiences").select("value, label, filled_dots").eq("is_active", true);
    const { data: masterHiring } = await supabase.from("master_hiring_locations").select("value, label").eq("is_active", true);
    const { data: masterTest } = await supabase.from("master_test_locations").select("value, label").eq("is_active", true);

    // Fetch active vacancies from job_vacancies table
    const { data: vacancies } = await supabase
      .from("job_vacancies")
      .select("*")
      .eq("is_active", true);

    // Fetch from assessment_metadata table (which is used in admin panel config/add candidate dialogs)
    const { data: dbMetadata } = await supabase
      .from("assessment_metadata")
      .select("*")
      .eq("is_active", true);

    let mRoles = masterRoles || [];
    let mExps = masterExperiences || [];
    let mHiring = masterHiring || [];
    let mTest = masterTest || [];

    if (dbMetadata && dbMetadata.length > 0) {
      const dbRoles = dbMetadata.filter(item => item.type === "role");
      if (dbRoles.length > 0) {
        mRoles = dbRoles.map(item => ({ value: item.value, label: item.label }));
      }
      const dbTest = dbMetadata.filter(item => item.type === "test_location");
      if (dbTest.length > 0) {
        mTest = dbTest.map(item => ({ value: item.value, label: item.label }));
      }
      const dbExps = dbMetadata.filter(item => item.type === "experience");
      if (dbExps.length > 0) {
        mExps = dbExps.map(item => ({ value: item.value, label: item.label, filled_dots: 2 }));
      }
    }

    const roles = mRoles.map(item => ({ value: item.value, label: item.label }));
    const experience = mExps.map(item => ({
      value: item.value,
      label: item.label,
      filled: (item as any).filled_dots ?? (item as any).filled ?? 1
    }));
    const testLocations = mTest.map(item => ({ value: item.value, label: item.label }));
    const hiringLocations = mHiring.map(item => ({ value: item.value, label: item.label }));

    return NextResponse.json({
      roles,
      experience,
      testLocations,
      hiringLocations,
      vacancies: vacancies || []
    })
  } catch (err) {
    console.error("Metadata API error:", err)
    return NextResponse.json({
      roles: [],
      experience: [],
      testLocations: [],
      hiringLocations: [],
      vacancies: []
    })
  }
}
