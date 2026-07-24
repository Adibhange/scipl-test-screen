"use client"

import { useState } from "react"
import { useAdminConfigurationsQuery } from "@/hooks/queries/useAdminQueries"
import {
	useCreateAdminConfigMutation,
	useUpdateAdminConfigMutation,
	useDeleteAdminConfigMutation,
} from "@/hooks/mutations/useAdminMutations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Briefcase,
  Building,
  Plus,
  Trash2,
  Edit3,
  AlertTriangle,
  Check,
  X,
  Users,
  Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"
import { PageHeader, EmptyState } from "@/components/ui/layout-primitives"
import { SectionCard } from "@/components/ui/enterprise-primitives"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type ConfirmDialogState =
  | { open: false }
  | {
      open: true
      type: "delete-vacancy"
      vacancyId: string
    }
  | {
      open: true
      type: "delete-master"
      masterId: string
      masterType: "role" | "experience" | "test_location" | "hiring_location"
    }

type ConfigItem = {
  id: string
  type: "role" | "experience" | "test_location" | "hiring_location"
  value: string
  label: string
  metadata: Record<string, unknown> | null
  is_active: boolean
}

type JobVacancy = {
  id: string
  role: string
  experience: string
  hiring_location: string
  test_locations: string[]
  openings: number
  is_active: boolean
  applicantCount?: number
  created_at: string
}

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters except alphanumeric, whitespace, hyphen, underscore
    .replace(/[-\s]+/g, "_") // Replace spaces/hyphens with a single underscore
    .replace(/_+/g, "_") // Remove duplicate underscores
    .replace(/^_+|_+$/g, ""); // Trim leading/trailing underscores
}

export function ConfigManager() {
  const { data, error: queryError } = useAdminConfigurationsQuery()
  const configs = data?.configs || []
  const vacancies = data?.vacancies || []
  const error = queryError ? (queryError.message || "Failed to load configs") : null

  // Isolated mutation hooks to prevent shared state/loading indicators
  const createVacancyMutation = useCreateAdminConfigMutation()
  const createRoleMutation = useCreateAdminConfigMutation()
  const createExperienceMutation = useCreateAdminConfigMutation()
  const createHiringLocationMutation = useCreateAdminConfigMutation()
  const createTestVenueMutation = useCreateAdminConfigMutation()

  const updateVacancyMutation = useUpdateAdminConfigMutation()
  const updateMasterMutation = useUpdateAdminConfigMutation()

  const deleteVacancyMutation = useDeleteAdminConfigMutation()
  const deleteMasterMutation = useDeleteAdminConfigMutation()

  // Master Lists edit inline state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    label: "",
    value: "",
    filledDots: "1"
  })

  // Predefined lists for Create Vacancy Form
  const [vacancyForm, setVacancyForm] = useState({
    role: "",
    customRole: "",
    experience: "",
    customExperience: "",
    hiringLocation: "",
    customHiringLocation: "",
    testLocations: [] as string[],
    openings: "1"
  })

  // Separate add form states for Master Data columns
  const [masterRoleForm, setMasterRoleForm] = useState({ label: "", value: "" })
  const [masterExpForm, setMasterExpForm] = useState({ label: "", value: "", filledDots: "1" })
  const [masterHiringForm, setMasterHiringForm] = useState({ label: "", value: "" })
  const [masterTestForm, setMasterTestForm] = useState({ label: "", value: "" })

  // Editing state for vacancy openings inline
  const [editingVacancyId, setEditingVacancyId] = useState<string | null>(null)
  const [editOpenings, setEditOpenings] = useState("1")

  // Track fields that fail validation for highlights
  const [invalidFields, setInvalidFields] = useState<string[]>([])

  const [confirmState, setConfirmState] = useState<ConfirmDialogState>({ open: false })

  // Local state for active master tab (isolated from useUiStore)
  const [activeMasterTab, setActiveMasterTab] = useState<"role" | "experience" | "hiring_location" | "test_location">("role")

  // Master configurations lists filtered by type
  const roles = configs.filter(c => c.type === "role" && c.is_active)
  const experiences = configs.filter(c => c.type === "experience" && c.is_active)
  const hiringLocations = configs.filter(c => c.type === "hiring_location" && c.is_active)
  const testLocations = configs.filter(c => c.type === "test_location" && c.is_active)

  // Master lists containing inactive options for editing
  const allRoles = configs.filter(c => c.type === "role")
  const allExperiences = configs.filter(c => c.type === "experience")
  const allHiringLocations = configs.filter(c => c.type === "hiring_location")
  const allTestLocations = configs.filter(c => c.type === "test_location")

  // ── Vacancies Actions ───────────────────────────────────────────

  async function handleCreateVacancy(e: React.FormEvent) {
    e.preventDefault()
    setInvalidFields([])

    const finalRole = vacancyForm.role === "custom" ? vacancyForm.customRole.trim() : vacancyForm.role
    const finalExp = vacancyForm.experience === "custom" ? vacancyForm.customExperience.trim() : vacancyForm.experience
    const finalHiring = vacancyForm.hiringLocation === "custom" ? vacancyForm.customHiringLocation.trim() : vacancyForm.hiringLocation

    const errors: string[] = []
    if (!finalRole) errors.push("vacancyRole")
    if (!finalExp) errors.push("vacancyExperience")
    if (!finalHiring) errors.push("vacancyHiringLocation")
    if (vacancyForm.testLocations.length === 0) errors.push("vacancyTestLocations")
    
    const openingsNum = Number(vacancyForm.openings)
    if (!vacancyForm.openings || isNaN(openingsNum) || openingsNum <= 0) {
      errors.push("vacancyOpenings")
    }

    if (errors.length > 0) {
      setInvalidFields(errors)
      toast.error("Unable to publish vacancy. Please correct the highlighted fields.")
      return
    }

    try {
      await createVacancyMutation.mutateAsync({
        type: "vacancy",
        role: finalRole,
        experience: finalExp,
        hiring_location: finalHiring,
        test_locations: vacancyForm.testLocations,
        openings: openingsNum
      })

      // Reset form
      setVacancyForm({
        role: "",
        customRole: "",
        experience: "",
        customExperience: "",
        hiringLocation: "",
        customHiringLocation: "",
        testLocations: [],
        openings: "1"
      })
      toast.success("Vacancy published successfully.")
    } catch (err: unknown) {
      console.error("Failed to publish vacancy:", err)
      toast.error("Unable to publish vacancy. Please try again.")
    }
  }

  async function toggleVacancyActive(vacancy: JobVacancy) {
    try {
      await updateVacancyMutation.mutateAsync({
        id: vacancy.id,
        isVacancy: true,
        is_active: !vacancy.is_active
      })
      toast.success("Vacancy status updated successfully.")
    } catch (err: unknown) {
      console.error("Failed to update vacancy status:", err)
      toast.error("Unable to update vacancy status. Please try again.")
    }
  }

  async function handleSaveOpenings(id: string) {
    setInvalidFields([])
    const num = Number(editOpenings)
    if (isNaN(num) || num < 0) {
      setInvalidFields(["editOpenings"])
      toast.error("Unable to update openings. Value must be a positive number.")
      return
    }

    try {
      await updateVacancyMutation.mutateAsync({
        id,
        isVacancy: true,
        openings: num
      })
      setEditingVacancyId(null)
      toast.success("Vacancy openings updated successfully.")
    } catch (err: unknown) {
      console.error("Failed to update openings:", err)
      toast.error("Unable to update vacancy openings. Please try again.")
    }
  }

  async function handleDeleteVacancy(id: string) {
    try {
      await deleteVacancyMutation.mutateAsync({ id, isVacancy: true })
      toast.success("Vacancy deleted successfully.")
    } catch (err: unknown) {
      console.error("Failed to delete vacancy:", err)
      toast.error("Unable to delete vacancy. Please try again.")
    }
  }

  // ── Master Config Actions ────────────────────────────────────────

  async function handleAddMaster(
    type: ConfigItem["type"],
    form: { label: string, value: string, filledDots?: string },
    resetForm: () => void,
    mutation: ReturnType<typeof useCreateAdminConfigMutation>,
    contextMessage: string
  ) {
    const val = form.value.trim()
    const lbl = form.label.trim()

    try {
      // NOTE: We pass `undefined` instead of `null` for non-experience config types
      // to strictly match backend validation expectations.
      const meta = type === "experience" ? { filled: Number(form.filledDots || 1) } : undefined

      await mutation.mutateAsync({
        type,
        label: lbl,
        value: val,
        metadata: meta
      })

      resetForm()
      toast.success("Option added successfully.")
    } catch (err: unknown) {
      console.error(`${contextMessage}:`, err)
      toast.error(`${contextMessage}. Please try again.`)
    }
  }

  const resetRoleForm = () => setMasterRoleForm({ label: "", value: "" })
  const handleAddRoleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setInvalidFields([])
    const errors: string[] = []
    if (!masterRoleForm.label.trim()) errors.push("roleLabel")
    if (!masterRoleForm.value.trim()) errors.push("roleValue")

    if (errors.length > 0) {
      setInvalidFields(errors)
      toast.error("Unable to create Role. Please correct the highlighted fields.")
      return
    }
    void handleAddMaster("role", masterRoleForm, resetRoleForm, createRoleMutation, "Unable to create Role")
  }

  const resetExpForm = () => setMasterExpForm({ label: "", value: "", filledDots: "1" })
  const handleAddExpSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setInvalidFields([])
    const errors: string[] = []
    if (!masterExpForm.label.trim()) errors.push("expLabel")
    if (!masterExpForm.value.trim()) errors.push("expValue")

    if (errors.length > 0) {
      setInvalidFields(errors)
      toast.error("Unable to save Experience. Please correct the highlighted fields.")
      return
    }
    void handleAddMaster("experience", masterExpForm, resetExpForm, createExperienceMutation, "Unable to save Experience")
  }

  const resetHiringForm = () => setMasterHiringForm({ label: "", value: "" })
  const handleAddHiringSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setInvalidFields([])
    const errors: string[] = []
    if (!masterHiringForm.label.trim()) errors.push("hiringLabel")
    if (!masterHiringForm.value.trim()) errors.push("hiringValue")

    if (errors.length > 0) {
      setInvalidFields(errors)
      toast.error("Unable to create Hiring Location. Please correct the highlighted fields.")
      return
    }
    void handleAddMaster("hiring_location", masterHiringForm, resetHiringForm, createHiringLocationMutation, "Unable to create Hiring Location")
  }

  const resetTestForm = () => setMasterTestForm({ label: "", value: "" })
  const handleAddTestSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setInvalidFields([])
    const errors: string[] = []
    if (!masterTestForm.label.trim()) errors.push("testLabel")
    if (!masterTestForm.value.trim()) errors.push("testValue")

    if (errors.length > 0) {
      setInvalidFields(errors)
      toast.error("Unable to create Test Venue. Please correct the highlighted fields.")
      return
    }
    void handleAddMaster("test_location", masterTestForm, resetTestForm, createTestVenueMutation, "Unable to create Test Venue")
  }

  async function toggleMasterActive(item: ConfigItem) {
    try {
      await updateMasterMutation.mutateAsync({
        id: item.id,
        type: item.type,
        is_active: !item.is_active
      })
      toast.success("Option status updated successfully.")
    } catch (err: unknown) {
      console.error("Failed to toggle option status:", err)
      toast.error("Unable to update option status. Please try again.")
    }
  }

  async function handleSaveMasterEdit(id: string, type: ConfigItem["type"]) {
    setInvalidFields([])
    if (!editForm.label.trim()) {
      setInvalidFields(["editLabel"])
      toast.error("Unable to save edits. Label is required.")
      return
    }

    try {
      // NOTE: We pass `undefined` instead of `null` for non-experience config edits.
      const meta = type === "experience" ? { filled: Number(editForm.filledDots) } : undefined

      await updateMasterMutation.mutateAsync({
        id,
        type,
        label: editForm.label.trim(),
        metadata: meta
      })
      setEditingId(null)
      toast.success("Option edits saved successfully.")
    } catch (err: unknown) {
      console.error("Failed to save master edits:", err)
      toast.error("Unable to save edits. Please try again.")
    }
  }

  async function handleDeleteMaster(id: string, type: ConfigItem["type"]) {
    try {
      await deleteMasterMutation.mutateAsync({ id, isVacancy: false, type })
      toast.success("Option deleted successfully.")
    } catch (err: unknown) {
      console.error("Failed to delete option:", err)
      toast.error("Unable to delete option. Please try again.")
    }
  }

  async function handleConfirmDelete() {
    if (!confirmState.open) return
    const state = confirmState
    setConfirmState({ open: false })

    if (state.type === "delete-vacancy") {
      await handleDeleteVacancy(state.vacancyId)
    } else if (state.type === "delete-master") {
      await handleDeleteMaster(state.masterId, state.masterType)
    }
  }

  function startMasterEdit(item: ConfigItem) {
    const meta = (item.metadata || {}) as Record<string, string | number>
    setEditingId(item.id)
    setInvalidFields([])
    setEditForm({
      label: item.label,
      value: item.value,
      filledDots: String(meta.filled ?? "1")
    })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Title */}
      <PageHeader
        title="Job Configuration & Vacancies"
        description="Manage open job openings, candidate test centers, hiring locations, and master dropdown options."
      />

      {/* Warnings & Errors */}
      {error && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-amber-900 flex gap-3 items-start animate-in fade-in duration-200">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-amber-800">Database Setup Warning</h4>
            <p className="text-[11px] leading-relaxed text-amber-700 font-medium">
              We couldn&apos;t load configuration records. Make sure both your separate master tables and `job_vacancies` schemas are successfully created in Supabase SQL editor.
            </p>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* 1. Main Job Vacancies Grid & Quick-Add Form */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Vacancy List Card */}
          <SectionCard
            title="Active Job Vacancies"
            description="Current openings published on candidate registration form."
            className="lg:col-span-2 min-h-120"
          >
            <div className="overflow-x-auto w-full">
              {vacancies.length === 0 ? (
                <EmptyState
                  title="No Job Vacancies created"
                  description="Use the form on the right to post a new vacancy by choosing from roles and experiences."
                  icon={Briefcase}
                />
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 font-bold border-b border-border/80">
                      <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-bold font-sans">Job Vacancy Description</th>
                      <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-bold font-sans">Locations</th>
                      <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-bold font-sans text-center">Openings</th>
                      <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-bold font-sans text-center">Applicants</th>
                      <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-bold font-sans text-center">Status</th>
                      <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-bold font-sans text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {vacancies.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/30 transition-colors">
                        <td className="px-4 py-3.5">
                          <p className="font-semibold text-foreground text-sm leading-tight tracking-tight">{item.role}</p>
                          <p className="text-[10px] text-muted-foreground mt-1 font-bold uppercase tracking-wider">{item.experience} Exp Required</p>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="space-y-1.5">
                            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground font-semibold">
                              <Building className="h-3.5 w-3.5 text-muted-foreground" /> {item.hiring_location}
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {(item.test_locations || []).map((locVal: string) => {
                                const found = testLocations.find(tl => tl.value === locVal);
                                return (
                                  <span key={locVal} className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-muted text-muted-foreground text-[9px] font-extrabold uppercase border border-border/60">
                                    {found?.label ?? locVal}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          {editingVacancyId === item.id ? (
                            <div className="flex items-center justify-center gap-1 max-w-20 mx-auto">
                              <Input
                                className="h-7 text-xs rounded-md text-center p-1 border-input focus-visible:ring-1 focus-visible:ring-indigo-500 bg-background"
                                value={editOpenings}
                                onChange={e => setEditOpenings(e.target.value)}
                                type="number"
                                min="0"
                                aria-label="Edit openings count"
                              />
                              <Button 
                                type="button"
                                size="icon-xs"
                                className="h-7 w-7 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer" 
                                onClick={() => handleSaveOpenings(item.id)}
                                aria-label="Save openings count"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-1.5 group">
                              <span className="font-extrabold text-foreground text-xs">{item.openings}</span>
                              <button 
                                type="button"
                                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition-opacity cursor-pointer focus-visible:opacity-100 focus-visible:ring-1 focus-visible:ring-indigo-500 outline-hidden" 
                                onClick={() => { setEditingVacancyId(item.id); setEditOpenings(String(item.openings)) }}
                                aria-label={`Edit openings count for ${item.role}`}
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted border border-border/60 px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                            <Users className="h-3 w-3 text-muted-foreground" /> {item.applicantCount ?? 0}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Switch
                              checked={item.is_active}
                              onCheckedChange={() => toggleVacancyActive(item)}
                              aria-label={`Toggle vacancy status for ${item.role}`}
                            />
                            <span className={cn(
                              "text-[10px] font-extrabold tracking-wide uppercase select-none w-10 text-left",
                              item.is_active ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/60"
                            )}>
                              {item.is_active ? "Open" : "Closed"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <button 
                            type="button"
                            className="p-1.5 hover:bg-destructive/10 text-destructive hover:text-destructive rounded-lg cursor-pointer transition-colors focus-visible:ring-1 focus-visible:ring-indigo-500 outline-hidden" 
                            onClick={() => setConfirmState({ open: true, type: "delete-vacancy", vacancyId: item.id })}
                            aria-label={`Delete vacancy opening for ${item.role}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </SectionCard>

          {/* Create Vacancy Form Card */}
          <SectionCard
            title="Create Job Vacancy"
            description="Link roles and configurations together."
          >
            <form onSubmit={handleCreateVacancy} className="space-y-4 text-xs font-bold text-slate-650 dark:text-slate-400">

              {/* Role */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-350">Role Title</label>
                <Select
                  value={vacancyForm.role}
                  onValueChange={v => {
                    setVacancyForm({ ...vacancyForm, role: v });
                    setInvalidFields(prev => prev.filter(f => f !== "vacancyRole"));
                  }}
                >
                  <SelectTrigger 
                    aria-invalid={invalidFields.includes("vacancyRole")}
                    className="h-9 rounded-lg border-input bg-background w-full text-xs font-semibold text-foreground focus:ring-1 focus:ring-indigo-500"
                  >
                    <SelectValue placeholder="Select Role" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-slate-200 shadow-xl p-1" position="popper" sideOffset={6}>
                    {roles.map(r => (
                      <SelectItem key={r.id} value={r.value} className="rounded-xl py-2.5 px-3 cursor-pointer text-xs font-semibold text-slate-705 hover:bg-indigo-55 hover:text-indigo-700 focus:bg-indigo-50 data-[state=checked]:bg-indigo-50 data-[state=checked]:text-indigo-700">
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Experience */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-350">Experience Requirement</label>
                <Select
                  value={vacancyForm.experience}
                  onValueChange={v => {
                    setVacancyForm({ ...vacancyForm, experience: v });
                    setInvalidFields(prev => prev.filter(f => f !== "vacancyExperience"));
                  }}
                >
                  <SelectTrigger 
                    aria-invalid={invalidFields.includes("vacancyExperience")}
                    className="h-9 rounded-lg border-input bg-background w-full text-xs font-semibold text-foreground focus:ring-1 focus:ring-indigo-500"
                  >
                    <SelectValue placeholder="Select Experience" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-slate-200 shadow-xl p-1" position="popper" sideOffset={6}>
                    {experiences.map(e => (
                      <SelectItem key={e.id} value={e.value} className="rounded-xl py-2.5 px-3 cursor-pointer text-xs font-semibold text-slate-750 hover:bg-indigo-50 focus:bg-indigo-50 data-[state=checked]:bg-indigo-50 data-[state=checked]:text-indigo-700">
                        <div className="flex items-center justify-between w-full gap-6">
                          <span>{e.label}</span>
                          <span className="inline-flex items-center gap-1">
                            {[0, 1, 2, 3].map(i => <span key={i} className={`h-1.5 w-2.5 rounded-full ${i < ((e.metadata as Record<string, number>)?.filled ?? 1) ? 'bg-indigo-505' : 'bg-slate-200'}`} />)}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Hiring Location */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-350">Hiring Location (Office Target)</label>
                <Select
                  value={vacancyForm.hiringLocation}
                  onValueChange={v => {
                    setVacancyForm({ ...vacancyForm, hiringLocation: v });
                    setInvalidFields(prev => prev.filter(f => f !== "vacancyHiringLocation"));
                  }}
                >
                  <SelectTrigger 
                    aria-invalid={invalidFields.includes("vacancyHiringLocation")}
                    className="h-9 rounded-lg border-input bg-background w-full text-xs font-semibold text-foreground focus:ring-1 focus:ring-indigo-500"
                  >
                    <SelectValue placeholder="Select Hiring Location" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-slate-200 shadow-xl p-1" position="popper" sideOffset={6}>
                    {hiringLocations.map(h => (
                      <SelectItem key={h.id} value={h.value} className="rounded-xl py-2.5 px-3 cursor-pointer text-xs font-semibold text-slate-705 hover:bg-indigo-50 hover:text-indigo-755 focus:bg-indigo-50 data-[state=checked]:bg-indigo-50 data-[state=checked]:text-indigo-700">
                        {h.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Test Location Array Checkbox selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-350">Exam Test Venues (Select 1 or more)</label>
                <div className={cn(
                  "grid grid-cols-2 gap-2.5 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-xl border border-border max-h-30 overflow-y-auto",
                  invalidFields.includes("vacancyTestLocations") && "border-destructive ring-1 ring-destructive/25"
                )}>
                  {testLocations.map(tl => (
                    <label key={tl.id} className="flex items-center gap-2 text-xs font-semibold text-slate-750 dark:text-slate-350 cursor-pointer select-none">
                      <Checkbox
                        checked={vacancyForm.testLocations.includes(tl.value)}
                        onCheckedChange={(checked) => {
                          setVacancyForm(prev => {
                            const list = checked
                              ? [...prev.testLocations, tl.value]
                              : prev.testLocations.filter(val => val !== tl.value)
                            return { ...prev, testLocations: list }
                          })
                          setInvalidFields(prev => prev.filter(f => f !== "vacancyTestLocations"));
                        }}
                      />
                      {tl.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Openings */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-350">No. of Openings (Available Vacancies)</label>
                <Input
                  aria-invalid={invalidFields.includes("vacancyOpenings")}
                  className="h-9 text-xs rounded-lg border-input bg-background"
                  value={vacancyForm.openings}
                  onChange={e => {
                    setVacancyForm({ ...vacancyForm, openings: e.target.value });
                    setInvalidFields(prev => prev.filter(f => f !== "vacancyOpenings"));
                  }}
                  type="number"
                  min="1"
                  placeholder="1"
                  aria-label="Number of openings input"
                />
              </div>

              <Button
                type="submit"
                disabled={createVacancyMutation.isPending}
                className="group w-full h-10 text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {createVacancyMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin text-current" />
                ) : (
                  <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90 text-current" />
                )}
                {createVacancyMutation.isPending ? "Publishing..." : "Publish Vacancy"}
              </Button>
            </form>
          </SectionCard>

        </div>

        {/* 2. Master Data Management lists */}
        <SectionCard
          title="Master Data Configuration"
          description="Add, toggle, or delete dynamic items used in vacancy selections."
          headerActions={
            <div className="flex gap-1 border border-border bg-muted/60 p-1 rounded-lg">
              {[
                { key: "role", label: "Roles" },
                { key: "experience", label: "Experiences" },
                { key: "hiring_location", label: "Hiring Locations" },
                { key: "test_location", label: "Test Venues" }
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => { setActiveMasterTab(tab.key as "role" | "experience" | "hiring_location" | "test_location"); setEditingId(null) }}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-[10px] font-bold transition-all cursor-pointer select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                    activeMasterTab === tab.key
                      ? "bg-background text-foreground shadow-xs border border-border/80"
                      : "text-muted-foreground hover:bg-background/40 hover:text-foreground"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start w-full">

            {/* Left Form: Add Master Option */}
            <div className="md:col-span-1 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 p-4 border border-border/80 space-y-4 font-semibold text-slate-600 dark:text-slate-400 text-xs">
              <h4 className="text-[11px] font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wide border-b border-border/40 pb-2">Add Master Option</h4>

              {activeMasterTab === "role" && (
                <form onSubmit={handleAddRoleSubmit} className="space-y-3">
                  <label className="block space-y-1">
                    Role Name
                    <Input
                      aria-invalid={invalidFields.includes("roleLabel")}
                      className="mt-1 h-9 border-input bg-background text-xs rounded-lg"
                      value={masterRoleForm.label}
                      onChange={e => {
                        const val = e.target.value;
                        setMasterRoleForm({ label: val, value: generateSlug(val) });
                        setInvalidFields(prev => prev.filter(f => f !== "roleLabel" && f !== "roleValue"));
                      }}
                      placeholder="e.g. NextJS Developer"
                    />
                  </label>
                  <label className="block space-y-1">
                    Database value identifier
                    <Input
                      aria-invalid={invalidFields.includes("roleValue")}
                      className="mt-1 h-9 border-input bg-background text-xs rounded-lg font-mono text-[11px]"
                      value={masterRoleForm.value}
                      onChange={e => {
                        setMasterRoleForm({ ...masterRoleForm, value: e.target.value });
                        setInvalidFields(prev => prev.filter(f => f !== "roleValue"));
                      }}
                      placeholder="e.g. nextjs_developer"
                    />
                  </label>
                  <Button type="submit" disabled={createRoleMutation.isPending} className="w-full h-9 text-xs font-bold mt-2 cursor-pointer flex items-center justify-center gap-1.5">
                    {createRoleMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {createRoleMutation.isPending ? "Adding..." : "Add to Master Roles"}
                  </Button>
                </form>
              )}

              {activeMasterTab === "experience" && (
                <form onSubmit={handleAddExpSubmit} className="space-y-3">
                  <label className="block space-y-1">
                    Display label
                    <Input
                      aria-invalid={invalidFields.includes("expLabel")}
                      className="mt-1 h-9 border-input bg-background text-xs rounded-lg"
                      value={masterExpForm.label}
                      onChange={e => {
                        const val = e.target.value;
                        setMasterExpForm({ ...masterExpForm, label: val, value: generateSlug(val) });
                        setInvalidFields(prev => prev.filter(f => f !== "expLabel" && f !== "expValue"));
                      }}
                      placeholder="e.g. 1–3 Years"
                    />
                  </label>
                  <label className="block space-y-1">
                    Database value identifier
                    <Input
                      aria-invalid={invalidFields.includes("expValue")}
                      className="mt-1 h-9 border-input bg-background text-xs rounded-lg font-mono text-[11px]"
                      value={masterExpForm.value}
                      onChange={e => {
                        setMasterExpForm({ ...masterExpForm, value: e.target.value });
                        setInvalidFields(prev => prev.filter(f => f !== "expValue"));
                      }}
                      placeholder="e.g. 1-3"
                    />
                  </label>
                  <label className="block space-y-1">
                    Progress Dots
                    <Select
                      value={masterExpForm.filledDots}
                      onValueChange={v => setMasterExpForm({ ...masterExpForm, filledDots: v })}
                    >
                      <SelectTrigger className="mt-1 h-9 border-input bg-background w-full text-xs font-semibold text-foreground focus:ring-1 focus:ring-indigo-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl border-slate-200 shadow-xl p-1" position="popper" sideOffset={6}>
                        {[["1", "Junior"], ["2", "Mid"], ["3", "Senior"], ["4", "Lead"]].map(([val, lbl], idx) => (
                          <SelectItem key={val} value={val} className="rounded-xl py-2 px-3 cursor-pointer text-xs font-semibold text-slate-700 hover:bg-indigo-55 hover:text-indigo-700 focus:bg-indigo-50 data-[state=checked]:bg-indigo-50 data-[state=checked]:text-indigo-700">
                            <div className="flex items-center justify-between w-full gap-4">
                              <span>{idx + 1} Dot{idx > 0 ? 's' : ''} · {lbl}</span>
                              <span className="inline-flex items-center gap-1">
                                {[0, 1, 2, 3].map(i => <span key={i} className={`h-1.5 w-2.5 rounded-full ${i <= idx ? 'bg-indigo-500' : 'bg-slate-200'}`} />)}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </label>
                  <Button type="submit" disabled={createExperienceMutation.isPending} className="w-full h-9 text-xs font-bold mt-2 cursor-pointer flex items-center justify-center gap-1.5">
                    {createExperienceMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {createExperienceMutation.isPending ? "Adding..." : "Add to Master Experiences"}
                  </Button>
                </form>
              )}

              {activeMasterTab === "hiring_location" && (
                <form onSubmit={handleAddHiringSubmit} className="space-y-3">
                  <label className="block space-y-1">
                    Location Name
                    <Input
                      aria-invalid={invalidFields.includes("hiringLabel")}
                      className="mt-1 h-9 border-input bg-background text-xs rounded-lg"
                      value={masterHiringForm.label}
                      onChange={e => {
                        const val = e.target.value;
                        setMasterHiringForm({ label: val, value: generateSlug(val) });
                        setInvalidFields(prev => prev.filter(f => f !== "hiringLabel" && f !== "hiringValue"));
                      }}
                      placeholder="e.g. Pune"
                    />
                  </label>
                  <label className="block space-y-1">
                    Database value identifier
                    <Input
                      aria-invalid={invalidFields.includes("hiringValue")}
                      className="mt-1 h-9 border-input bg-background text-xs rounded-lg font-mono text-[11px]"
                      value={masterHiringForm.value}
                      onChange={e => {
                        setMasterHiringForm({ ...masterHiringForm, value: e.target.value });
                        setInvalidFields(prev => prev.filter(f => f !== "hiringValue"));
                      }}
                      placeholder="e.g. pune"
                    />
                  </label>
                  <Button type="submit" disabled={createHiringLocationMutation.isPending} className="w-full h-9 text-xs font-bold mt-2 cursor-pointer flex items-center justify-center gap-1.5">
                    {createHiringLocationMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {createHiringLocationMutation.isPending ? "Adding..." : "Add to Hiring Locations"}
                  </Button>
                </form>
              )}

              {activeMasterTab === "test_location" && (
                <form onSubmit={handleAddTestSubmit} className="space-y-3">
                  <label className="block space-y-1">
                    Test Venue Name
                    <Input
                      aria-invalid={invalidFields.includes("testLabel")}
                      className="mt-1 h-9 border-input bg-background text-xs rounded-lg"
                      value={masterTestForm.label}
                      onChange={e => {
                        const val = e.target.value;
                        setMasterTestForm({ label: val, value: generateSlug(val) });
                        setInvalidFields(prev => prev.filter(f => f !== "testLabel" && f !== "testValue"));
                      }}
                      placeholder="e.g. Pune Office"
                    />
                  </label>
                  <label className="block space-y-1">
                    Database value identifier
                    <Input
                      aria-invalid={invalidFields.includes("testValue")}
                      className="mt-1 h-9 border-input bg-background text-xs rounded-lg font-mono text-[11px]"
                      value={masterTestForm.value}
                      onChange={e => {
                        setMasterTestForm({ ...masterTestForm, value: e.target.value });
                        setInvalidFields(prev => prev.filter(f => f !== "testValue"));
                      }}
                      placeholder="e.g. pune_office"
                    />
                  </label>
                  <Button type="submit" disabled={createTestVenueMutation.isPending} className="w-full h-9 text-xs font-bold mt-2 cursor-pointer flex items-center justify-center gap-1.5">
                    {createTestVenueMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {createTestVenueMutation.isPending ? "Adding..." : "Add to Test Venues"}
                  </Button>
                </form>
              )}
            </div>

            {/* Right Table: Master List Options */}
            <div className="md:col-span-2 border border-border rounded-xl bg-slate-50/10 dark:bg-slate-900/10 overflow-hidden">
              <div className="overflow-x-auto w-full max-h-90 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/50 dark:bg-slate-900/50 text-slate-500 font-bold border-b border-border/80">
                      <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-bold font-sans">Display Option</th>
                      <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-bold font-mono">DB value</th>
                      <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-bold font-sans text-center">Status</th>
                      <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-muted-foreground font-bold font-sans text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 bg-white dark:bg-slate-955">
                    {(activeMasterTab === "role" ? allRoles
                      : activeMasterTab === "experience" ? allExperiences
                        : activeMasterTab === "hiring_location" ? allHiringLocations
                          : allTestLocations
                    ).map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/45 dark:hover:bg-slate-900/40 transition-colors">
                        <td className="px-4 py-3">
                          {editingId === item.id ? (
                            <div className="space-y-1.5 max-w-50">
                              <Input
                                aria-invalid={invalidFields.includes("editLabel")}
                                className="h-8 text-xs rounded-md"
                                value={editForm.label}
                                onChange={e => {
                                  setEditForm({ ...editForm, label: e.target.value });
                                  setInvalidFields(prev => prev.filter(f => f !== "editLabel"));
                                }}
                              />
                              {activeMasterTab === "experience" && (
                                <Select
                                  value={editForm.filledDots}
                                  onValueChange={v => setEditForm({ ...editForm, filledDots: v })}
                                >
                                  <SelectTrigger className="h-8 rounded-lg border-slate-200 bg-white dark:bg-slate-955 w-full text-xs font-semibold text-slate-750 dark:text-slate-300 focus:ring-1 focus:ring-indigo-500">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-2xl border-slate-200 shadow-xl p-1" position="popper" sideOffset={6}>
                                    {[["1", "Junior"], ["2", "Mid"], ["3", "Senior"], ["4", "Lead"]].map(([val, lbl], idx) => (
                                      <SelectItem key={val} value={val} className="rounded-xl py-2 px-3 cursor-pointer text-xs font-semibold text-slate-700 hover:bg-indigo-55 hover:text-indigo-705 focus:bg-indigo-50 data-[state=checked]:bg-indigo-50 data-[state=checked]:text-indigo-700">
                                        <div className="flex items-center justify-between w-full gap-4">
                                          <span>{lbl}</span>
                                          <span className="inline-flex items-center gap-1">
                                            {[0, 1, 2, 3].map(i => <span key={i} className={`h-1.5 w-2.5 rounded-full ${i <= idx ? 'bg-indigo-555' : 'bg-slate-200'}`} />)}
                                          </span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                              <div className="flex gap-1.5 pt-0.5">
                                <Button type="button" size="icon-xs" className="h-7 w-7 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer" onClick={() => handleSaveMasterEdit(item.id, activeMasterTab)}>
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                                <Button type="button" size="icon-xs" variant="outline" className="h-7 w-7 rounded-md cursor-pointer border-slate-200 text-slate-500 hover:bg-slate-100" onClick={() => setEditingId(null)}>
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <p className="font-semibold text-foreground text-sm tracking-tight">{item.label}</p>
                              {item.type === "experience" && item.metadata && !!item.metadata.filled && (
                                <span className="inline-flex items-center gap-1 mt-1">
                                  <span className="text-[10px] text-muted-foreground font-medium">Complexity level:</span>
                                  <span className="inline-flex items-center gap-0.5">
                                    {[0, 1, 2, 3].map(i => (
                                      <span key={i} className={`h-1.5 w-1.5 rounded-full ${i < Number(item.metadata?.filled) ? 'bg-indigo-500' : 'bg-slate-200'}`} />
                                    ))}
                                  </span>
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground/80">{item.value}</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Switch
                              checked={item.is_active}
                              onCheckedChange={() => toggleMasterActive(item)}
                              aria-label={`Toggle master status for ${item.label}`}
                            />
                            <span className={cn(
                              "text-[10px] font-extrabold uppercase select-none w-12 text-left",
                              item.is_active ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/60"
                            )}>
                              {item.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button 
                              type="button"
                              className="p-1 hover:bg-muted text-muted-foreground rounded-md cursor-pointer focus-visible:ring-1 focus-visible:ring-indigo-500 outline-hidden" 
                              onClick={() => startMasterEdit(item)}
                              aria-label={`Edit master option ${item.label}`}
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button 
                              type="button"
                              className="p-1 hover:bg-destructive/10 text-destructive rounded-md cursor-pointer focus-visible:ring-1 focus-visible:ring-indigo-500 outline-hidden" 
                              onClick={() => setConfirmState({ open: true, type: "delete-master", masterId: item.id, masterType: activeMasterTab })}
                              aria-label={`Delete master option ${item.label}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </SectionCard>
      </div>

      <AlertDialog
        open={confirmState.open}
        onOpenChange={(open) => {
          if (!open) setConfirmState({ open: false })
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmState.open && confirmState.type === "delete-vacancy" && "Delete Vacancy?"}
              {confirmState.open && confirmState.type === "delete-master" && "Delete Master Option?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmState.open && confirmState.type === "delete-vacancy" && (
                "This action cannot be undone. The selected vacancy and all related configuration references will be permanently removed."
              )}
              {confirmState.open && confirmState.type === "delete-master" && (
                "This action cannot be undone. The selected option will be permanently removed. Standard dropdowns in vacancies using this will fall back to literal value representation."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700 text-white font-medium"
              onClick={handleConfirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
