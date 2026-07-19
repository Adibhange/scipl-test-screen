import "dotenv/config"
import { createClient } from "@supabase/supabase-js"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceRoleKey) {
  console.error("Missing SUPABASE URL or SERVICE ROLE KEY in environment variables.")
  process.exit(1)
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const defaultMetadata = [
  // ── Roles ──────────────────────────────────────────────────
  {
    type: "role",
    value: "SQL Developer",
    label: "SQL Developer",
    metadata: {
      track: "Data Track",
      category: "it",
      icon: "database",
      accent: "#4F46E5",
      soft: "#EEF2FF"
    }
  },
  {
    type: "role",
    value: "NextJS Developer",
    label: "NextJS Developer",
    metadata: {
      track: "Frontend Track",
      category: "it",
      icon: "code",
      accent: "#0F172A",
      soft: "#F1F5F9"
    }
  },
  {
    type: "role",
    value: "Full Stack Developer",
    label: "Full Stack Developer",
    metadata: {
      track: "Combined Track",
      category: "it",
      icon: "rocket",
      accent: "#D97706",
      soft: "#FFFBEB"
    }
  },
  {
    type: "role",
    value: "Project Manager",
    label: "Project Manager",
    metadata: {
      track: "Management Track",
      category: "non-it",
      icon: "briefcase",
      accent: "#10B981",
      soft: "#EEF2FF"
    }
  },
  {
    type: "role",
    value: "React Native Developer",
    label: "React Native Developer",
    metadata: {
      track: "Mobile Track",
      category: "it",
      icon: "code",
      accent: "#0F172A",
      soft: "#F1F5F9"
    }
  },
  
  // ── Experience Levels ──────────────────────────────────────
  {
    type: "experience",
    value: "0-1",
    label: "0–1 Years",
    metadata: { filled: 1 }
  },
  {
    type: "experience",
    value: "1-3",
    label: "1–3 Years",
    metadata: { filled: 2 }
  },
  {
    type: "experience",
    value: "3-5",
    label: "3–5 Years",
    metadata: { filled: 3 }
  },
  {
    type: "experience",
    value: "5+",
    label: "5+ Years",
    metadata: { filled: 4 }
  },

  // ── Test Locations ─────────────────────────────────────────
  {
    type: "test_location",
    value: "home",
    label: "Home"
  },
  {
    type: "test_location",
    value: "pune_office",
    label: "Pune Office"
  },
  {
    type: "test_location",
    value: "thane_office",
    label: "Thane Office"
  },
  {
    type: "test_location",
    value: "other",
    label: "Other"
  },

  // ── Hiring Locations ───────────────────────────────────────
  {
    type: "hiring_location",
    value: "pune",
    label: "Pune"
  },
  {
    type: "hiring_location",
    value: "thane",
    label: "Thane"
  },
  {
    type: "hiring_location",
    value: "remote",
    label: "Remote"
  },
  {
    type: "hiring_location",
    value: "other",
    label: "Other"
  }
]

async function seed() {
  console.log("Seeding assessment metadata into database...")
  
  for (const item of defaultMetadata) {
    const { error } = await supabase
      .from("assessment_metadata")
      .upsert(item, { onConflict: "type,value" })
      
    if (error) {
      console.error(`Failed to upsert item type: ${item.type}, value: ${item.value}: ${error.message}`)
    } else {
      console.log(`Successfully upserted: [${item.type}] ${item.value}`)
    }
  }
  
  console.log("Metadata seeding process finished.")
}

seed().catch(console.error)
