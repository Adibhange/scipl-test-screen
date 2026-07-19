import { NextRequest, NextResponse } from "next/server"
import { getCurrentAdmin } from "@/lib/admin-auth"
import { getSupabaseServerClient } from "@/lib/db"

export const dynamic = "force-dynamic"

// Helper to check HR permissions
async function checkHRPermission() {
  const admin = await getCurrentAdmin()
  if (!admin || admin.role !== "hr") {
    return { authorized: false, errorResponse: NextResponse.json({ error: "HR access required" }, { status: 403 }) }
  }
  return { authorized: true }
}

export async function GET() {
  const auth = await checkHRPermission()
  if (!auth.authorized) return auth.errorResponse!

  try {
    const client = getSupabaseServerClient();

    // 1. Fetch master configurations from separate tables
    const { data: roles } = await client.from("master_roles").select("*").order("created_at", { ascending: true })
    const { data: experiences } = await client.from("master_experiences").select("*").order("created_at", { ascending: true })
    const { data: hiring } = await client.from("master_hiring_locations").select("*").order("created_at", { ascending: true })
    const { data: test } = await client.from("master_test_locations").select("*").order("created_at", { ascending: true })

    // Map separate tables to configs response structure
    const configItems = [
      ...(roles || []).map(r => ({ id: r.id, type: "role", value: r.value, label: r.label, is_active: r.is_active, metadata: {} })),
      ...(experiences || []).map(e => ({ id: e.id, type: "experience", value: e.value, label: e.label, is_active: e.is_active, metadata: { filled: e.filled_dots } })),
      ...(hiring || []).map(h => ({ id: h.id, type: "hiring_location", value: h.value, label: h.label, is_active: h.is_active, metadata: {} })),
      ...(test || []).map(t => ({ id: t.id, type: "test_location", value: t.value, label: t.label, is_active: t.is_active, metadata: {} }))
    ]

    // 2. Fetch vacancies
    const { data: vacancies, error: vacancyError } = await client
      .from("job_vacancies")
      .select("*")
      .order("created_at", { ascending: true })

    if (vacancyError) {
      console.warn("job_vacancies query error:", vacancyError.message)
    }

    // 3. Fetch candidate applications to count active applicants per role+experience combination
    const { data: candidates } = await client
      .from("candidates")
      .select("role, experience")

    const applicantCounts: Record<string, number> = {}
    if (candidates && candidates.length > 0) {
      candidates.forEach((candidate) => {
        const key = `${candidate.role || ""}_${candidate.experience || ""}`.toLowerCase();
        applicantCounts[key] = (applicantCounts[key] || 0) + 1;
      });
    }

    // Map applicant counts into the vacancies array
    const mappedVacancies = (vacancies || []).map((vacancy) => {
      const key = `${vacancy.role || ""}_${vacancy.experience || ""}`.toLowerCase();
      return {
        ...vacancy,
        applicantCount: applicantCounts[key] ?? 0
      };
    });

    return NextResponse.json({
      configs: configItems,
      vacancies: mappedVacancies
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to load configs"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await checkHRPermission()
  if (!auth.authorized) return auth.errorResponse!

  try {
    const body = await request.json()
    const client = getSupabaseServerClient()

    if (body.type === "vacancy") {
      if (!body.role || !body.experience || !body.hiring_location || !body.test_locations || !Array.isArray(body.test_locations)) {
        return NextResponse.json({ error: "role, experience, hiring_location and test_locations (array) are required for vacancies" }, { status: 400 })
      }

      const { data, error } = await client
        .from("job_vacancies")
        .insert({
          role: body.role.trim(),
          experience: body.experience.trim(),
          hiring_location: body.hiring_location.trim(),
          test_locations: body.test_locations,
          openings: Number(body.openings || 1),
          is_active: body.is_active !== false
        })
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json(data, { status: 201 })
    } else {
      if (!body.type || !body.value || !body.label) {
        return NextResponse.json({ error: "type, value and label are required" }, { status: 400 })
      }

      const type = body.type
      let targetTable = ""
      let insertData: Record<string, unknown> = {
        value: body.value.trim(),
        label: body.label.trim(),
        is_active: body.is_active !== false
      }

      if (type === "role") {
        targetTable = "master_roles"
      } else if (type === "experience") {
        targetTable = "master_experiences"
        insertData.filled_dots = Number(body.metadata?.filled ?? 1)
      } else if (type === "hiring_location") {
        targetTable = "master_hiring_locations"
      } else if (type === "test_location") {
        targetTable = "master_test_locations"
      } else {
        return NextResponse.json({ error: `Unknown configuration type: ${type}` }, { status: 400 })
      }

      const { data, error } = await client
        .from(targetTable)
        .insert(insertData)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      const mapped = {
        id: data.id,
        type,
        value: data.value,
        label: data.label,
        is_active: data.is_active,
        metadata: type === "experience" ? { filled: data.filled_dots } : {}
      }

      return NextResponse.json(mapped, { status: 201 })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create config"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await checkHRPermission()
  if (!auth.authorized) return auth.errorResponse!

  try {
    const body = await request.json()
    if (!body.id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 })
    }

    const client = getSupabaseServerClient()

    if (body.isVacancy) {
      const updates: Record<string, unknown> = {}
      if (body.is_active !== undefined) updates.is_active = body.is_active
      if (body.openings !== undefined) updates.openings = Number(body.openings)
      if (body.role !== undefined) updates.role = body.role.trim()
      if (body.experience !== undefined) updates.experience = body.experience.trim()
      if (body.hiring_location !== undefined) updates.hiring_location = body.hiring_location.trim()
      if (body.test_locations !== undefined) updates.test_locations = body.test_locations

      const { data, error } = await client
        .from("job_vacancies")
        .update(updates)
        .eq("id", body.id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json(data)
    } else {
      if (!body.type) {
        return NextResponse.json({ error: "type is required to identify target master table" }, { status: 400 })
      }

      const type = body.type
      let targetTable = ""
      const updates: Record<string, unknown> = {}
      
      if (body.label !== undefined) updates.label = body.label.trim()
      if (body.is_active !== undefined) updates.is_active = body.is_active

      if (type === "role") {
        targetTable = "master_roles"
      } else if (type === "experience") {
        targetTable = "master_experiences"
        if (body.metadata?.filled !== undefined) {
          updates.filled_dots = Number(body.metadata.filled)
        }
      } else if (type === "hiring_location") {
        targetTable = "master_hiring_locations"
      } else if (type === "test_location") {
        targetTable = "master_test_locations"
      } else {
        return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 })
      }

      const { data, error } = await client
        .from(targetTable)
        .update(updates)
        .eq("id", body.id)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      const mapped = {
        id: data.id,
        type,
        value: data.value,
        label: data.label,
        is_active: data.is_active,
        metadata: type === "experience" ? { filled: data.filled_dots } : {}
      }

      return NextResponse.json(mapped)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update config"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await checkHRPermission()
  if (!auth.authorized) return auth.errorResponse!

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    const isVacancy = searchParams.get("isVacancy") === "true"

    if (!id) {
      return NextResponse.json({ error: "id parameter is required" }, { status: 400 })
    }

    const client = getSupabaseServerClient()

    if (isVacancy) {
      const { error } = await client
        .from("job_vacancies")
        .delete()
        .eq("id", id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ success: true })
    } else {
      const type = searchParams.get("type")
      if (!type) {
        return NextResponse.json({ error: "type parameter is required to identify target master table" }, { status: 400 })
      }

      let targetTable = ""
      if (type === "role") targetTable = "master_roles"
      else if (type === "experience") targetTable = "master_experiences"
      else if (type === "hiring_location") targetTable = "master_hiring_locations"
      else if (type === "test_location") targetTable = "master_test_locations"
      else return NextResponse.json({ error: `Unknown type: ${type}` }, { status: 400 })

      const { error } = await client
        .from(targetTable)
        .delete()
        .eq("id", id)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      return NextResponse.json({ success: true })
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to delete config"
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
