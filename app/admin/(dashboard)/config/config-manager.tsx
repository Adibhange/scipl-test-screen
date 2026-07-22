"use client"

import { useState } from "react"
import { useUiStore } from "@/stores/ui.store"
import { useAdminConfigurationsQuery } from "@/hooks/queries/useAdminQueries"
import {
	useCreateAdminConfigMutation,
	useUpdateAdminConfigMutation,
	useDeleteAdminConfigMutation,
} from "@/hooks/mutations/useAdminMutations"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  ToggleLeft,
  ToggleRight,
  Check,
  X,
  Users,
  Settings,
  Loader2
} from "lucide-react"
import { cn } from "@/lib/utils"

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

export function ConfigManager() {
  const { data, isLoading: loading, error: queryError } = useAdminConfigurationsQuery()
  const configs = data?.configs || []
  const vacancies = data?.vacancies || []
  const error = queryError ? (queryError.message || "Failed to load configs") : null

  const createConfigMutation = useCreateAdminConfigMutation()
  const updateConfigMutation = useUpdateAdminConfigMutation()
  const deleteConfigMutation = useDeleteAdminConfigMutation()

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

  const [customTestVenueInput, setCustomTestVenueInput] = useState("")

  // Separate add form states for Master Data columns
  const [masterRoleForm, setMasterRoleForm] = useState({ label: "", value: "" })
  const [masterExpForm, setMasterExpForm] = useState({ label: "", value: "", filledDots: "1" })
  const [masterHiringForm, setMasterHiringForm] = useState({ label: "", value: "" })
  const [masterTestForm, setMasterTestForm] = useState({ label: "", value: "" })

  // Editing state for vacancy openings inline
  const [editingVacancyId, setEditingVacancyId] = useState<string | null>(null)
  const [editOpenings, setEditOpenings] = useState("1")

  const [actionError, setActionError] = useState<string | null>(null)
  const rawAdminTab = useUiStore((state) => state.activeAdminTab);
  const activeMasterTab = (rawAdminTab === "candidates" || rawAdminTab === "hr" || rawAdminTab === "interviewer") ? "role" : (rawAdminTab as "role" | "experience" | "hiring_location" | "test_location");
  const setActiveMasterTab = useUiStore((state) => state.setActiveAdminTab);

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
    setActionError(null)

    const finalRole = vacancyForm.role === "custom" ? vacancyForm.customRole.trim() : vacancyForm.role
    const finalExp = vacancyForm.experience === "custom" ? vacancyForm.customExperience.trim() : vacancyForm.experience
    const finalHiring = vacancyForm.hiringLocation === "custom" ? vacancyForm.customHiringLocation.trim() : vacancyForm.hiringLocation

    if (!finalRole || !finalExp || !finalHiring || vacancyForm.testLocations.length === 0) {
      setActionError("All fields (Role, Experience, Hiring Location, and at least one Test Location) are required to publish a vacancy.")
      return
    }

    try {
      await createConfigMutation.mutateAsync({
        type: "vacancy",
        role: finalRole,
        experience: finalExp,
        hiring_location: finalHiring,
        test_locations: vacancyForm.testLocations,
        openings: Number(vacancyForm.openings || 1)
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create vacancy"
      setActionError(msg)
    }
  }

  async function toggleVacancyActive(vacancy: JobVacancy) {
    try {
      await updateConfigMutation.mutateAsync({
        id: vacancy.id,
        isVacancy: true,
        is_active: !vacancy.is_active
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update status"
      alert(msg)
    }
  }

  async function handleSaveOpenings(id: string) {
    setActionError(null)
    const num = Number(editOpenings)
    if (isNaN(num) || num < 0) {
      setActionError("Openings must be a positive number.")
      return
    }

    try {
      await updateConfigMutation.mutateAsync({
        id,
        isVacancy: true,
        openings: num
      })

      setEditingVacancyId(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save openings"
      setActionError(msg)
    }
  }

  async function handleDeleteVacancy(id: string) {
    if (!confirm("Are you sure you want to delete this vacancy? Registered candidates can still view their active processes, but new registrations will be blocked.")) return

    try {
      await deleteConfigMutation.mutateAsync({ id, isVacancy: true })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete vacancy"
      alert(msg)
    }
  }

  // ── Master Configs Actions ─────────────────────────────────────

  async function handleAddMaster(type: ConfigItem["type"], fields: Record<string, string>) {
    setActionError(null)
    if (!fields.label || !fields.value) {
      setActionError("Label and Value are required.")
      return
    }

    try {
      let metadata: Record<string, unknown> = {}
      if (type === "experience") {
        metadata = {
          filled: Number(fields.filledDots || 1)
        }
      }

      await createConfigMutation.mutateAsync({
        type,
        value: fields.value.trim(),
        label: fields.label.trim(),
        metadata
      })

      // Reset forms
      if (type === "role") {
        setMasterRoleForm({ label: "", value: "" })
      } else if (type === "experience") {
        setMasterExpForm({ label: "", value: "", filledDots: "1" })
      } else if (type === "hiring_location") {
        setMasterHiringForm({ label: "", value: "" })
      } else if (type === "test_location") {
        setMasterTestForm({ label: "", value: "" })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add configuration"
      setActionError(msg)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function handleQuickAddTestVenue() {
    if (!customTestVenueInput.trim()) return
    const value = customTestVenueInput.trim().toLowerCase().replace(/\s+/g, "_")
    const label = customTestVenueInput.trim()

    try {
      await createConfigMutation.mutateAsync({
        type: "test_location",
        value,
        label
      })

      setVacancyForm(prev => ({
        ...prev,
        testLocations: [...prev.testLocations, value]
      }))
      setCustomTestVenueInput("")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add test location"
      alert(msg)
    }
  }

  async function toggleMasterActive(item: ConfigItem) {
    try {
      await updateConfigMutation.mutateAsync({
        id: item.id,
        type: item.type,
        is_active: !item.is_active
      })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update status"
      alert(msg)
    }
  }

  async function handleSaveMasterEdit(id: string, type: ConfigItem["type"]) {
    setActionError(null)
    if (!editForm.label) {
      setActionError("Label is required.")
      return
    }

    try {
      let metadata: Record<string, unknown> = {}
      if (type === "experience") {
        metadata = {
          filled: Number(editForm.filledDots || 1)
        }
      }

      await updateConfigMutation.mutateAsync({
        id,
        type,
        label: editForm.label.trim(),
        metadata
      })

      setEditingId(null)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update configuration"
      setActionError(msg)
    }
  }

  async function handleDeleteMaster(id: string, type: ConfigItem["type"]) {
    if (!confirm("Are you sure you want to delete this option? Open vacancies containing this configuration choice may be affected.")) return

    try {
      await deleteConfigMutation.mutateAsync({ id, isVacancy: false, type })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete option"
      alert(msg)
    }
  }

  function startMasterEdit(item: ConfigItem) {
    const meta = (item.metadata || {}) as Record<string, string | number>
    setEditingId(item.id)
    setEditForm({
      label: item.label,
      value: item.value,
      filledDots: String(meta.filled ?? "1")
    })
  }

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="border-b border-slate-100 pb-4">
        <h2 className="text-xl font-bold tracking-tight text-slate-900">Job Configuration & Vacancies</h2>
        <p className="text-xs text-slate-500 mt-0.5 font-medium">Manage open job descriptions, candidate test centers, hiring targets, and standalone dropdown configurations.</p>
      </div>

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

      {actionError && (
        <div className="rounded-xl border border-red-200 bg-red-50/50 p-3 text-red-950 text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-top-1">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {loading ? (
        <div className="text-xs text-slate-400 py-16 text-center animate-pulse">Loading system configurations...</div>
      ) : (
        <div className="space-y-8">

          {/* 1. Main Job Vacancies Grid & Quick-Add Form */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

            {/* Vacancy List Card */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col min-h-[480px]">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Briefcase className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Active Job Vacancies</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Current openings published on candidate registration form.</p>
                </div>
              </div>

              <div className="flex-1 overflow-x-auto">
                {vacancies.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-xl text-center p-6">
                    <Briefcase className="h-8 w-8 text-slate-350 mb-2" />
                    <p className="text-xs font-bold text-slate-400">No Job Vacancies created.</p>
                    <p className="text-[10px] text-slate-400 max-w-xs mt-1 leading-relaxed">Use the form on the right to post a new vacancy by choosing from roles and experiences.</p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 text-slate-500 font-bold border-b border-slate-200">
                        <th className="px-4 py-2.5">Job Vacancy Description</th>
                        <th className="px-4 py-2.5">Locations</th>
                        <th className="px-4 py-2.5 text-center">Openings</th>
                        <th className="px-4 py-2.5 text-center">Applicants</th>
                        <th className="px-4 py-2.5 text-center">Status</th>
                        <th className="px-4 py-2.5 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {vacancies.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50/30 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-bold text-slate-850 text-xs leading-tight">{item.role}</p>
                            <p className="text-[10px] text-slate-450 mt-0.5 font-semibold uppercase">{item.experience} Exp Required</p>
                          </td>
                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 text-[10px] text-slate-550 font-bold">
                                <Building className="h-3 w-3 text-slate-400" /> {item.hiring_location}
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {(item.test_locations || []).map((locVal: string) => {
                                  const found = testLocations.find(tl => tl.value === locVal)
                                  return (
                                    <span key={locVal} className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[9px] font-extrabold uppercase">
                                      {found?.label ?? locVal}
                                    </span>
                                  )
                                })}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {editingVacancyId === item.id ? (
                              <div className="flex items-center justify-center gap-1 max-w-[80px] mx-auto">
                                <Input
                                  className="h-7 text-xs rounded-md text-center p-1 border-slate-200"
                                  value={editOpenings}
                                  onChange={e => setEditOpenings(e.target.value)}
                                  type="number"
                                  min="0"
                                />
                                <Button size="icon" className="h-6 w-6 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer" onClick={() => handleSaveOpenings(item.id)}>
                                  <Check className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1 group">
                                <span className="font-extrabold text-slate-850 text-xs">{item.openings}</span>
                                <button className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-100 text-slate-400 hover:text-slate-650 rounded transition-opacity cursor-pointer" onClick={() => { setEditingVacancyId(item.id); setEditOpenings(String(item.openings)) }}>
                                  <Edit3 className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                              <Users className="h-3 w-3 text-slate-400" /> {item.applicantCount ?? 0}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => toggleVacancyActive(item)}
                              className="text-[10px] font-bold text-slate-400 hover:text-indigo-650 cursor-pointer flex items-center justify-center gap-0.5 mx-auto"
                            >
                              {item.is_active ? (
                                <span className="text-emerald-600 flex items-center font-bold"><ToggleRight className="h-5 w-5 text-emerald-500" /> Open</span>
                              ) : (
                                <span className="text-slate-400 flex items-center font-bold"><ToggleLeft className="h-5 w-5 text-slate-350" /> Closed</span>
                              )}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button className="p-1.5 hover:bg-red-50 text-red-500 hover:text-red-700 rounded-lg cursor-pointer transition-colors" onClick={() => handleDeleteVacancy(item.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Create Vacancy Form Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Plus className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Create Job Vacancy</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Link roles and configurations together.</p>
                </div>
              </div>

              <form onSubmit={handleCreateVacancy} className="space-y-4 text-xs font-bold text-slate-650">
                {/* Role */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Role Title</label>
                  <Select
                    value={vacancyForm.role}
                    onValueChange={v => setVacancyForm({ ...vacancyForm, role: v })}
                  >
                    <SelectTrigger className="h-9 rounded-lg border-slate-200 bg-white w-full text-xs font-semibold text-slate-700 focus:ring-1 focus:ring-indigo-500">
                      <SelectValue placeholder="Select Role" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-slate-200 shadow-xl p-1" position="popper" sideOffset={6}>
                      {roles.map(r => (
                        <SelectItem key={r.id} value={r.value} className="rounded-xl py-2.5 px-3 cursor-pointer text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 focus:bg-indigo-50 data-[state=checked]:bg-indigo-50 data-[state=checked]:text-indigo-700">
                          {r.label}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom" className="rounded-xl py-2.5 px-3 cursor-pointer text-xs font-semibold text-indigo-500 hover:bg-indigo-50 focus:bg-indigo-50">
                        + Type Custom Role
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {vacancyForm.role === "custom" && (
                    <Input
                      className="mt-1 h-8 text-xs rounded-lg"
                      value={vacancyForm.customRole}
                      onChange={e => setVacancyForm({ ...vacancyForm, customRole: e.target.value })}
                      placeholder="e.g. ReactJS Developer"
                    />
                  )}
                </div>

                {/* Experience */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Experience Requirement</label>
                  <Select
                    value={vacancyForm.experience}
                    onValueChange={v => setVacancyForm({ ...vacancyForm, experience: v })}
                  >
                    <SelectTrigger className="h-9 rounded-lg border-slate-200 bg-white w-full text-xs font-semibold text-slate-700 focus:ring-1 focus:ring-indigo-500">
                      <SelectValue placeholder="Select Experience" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-slate-200 shadow-xl p-1" position="popper" sideOffset={6}>
                      {experiences.map(e => (
                        <SelectItem key={e.id} value={e.value} className="rounded-xl py-2.5 px-3 cursor-pointer text-xs font-semibold text-slate-700 hover:bg-indigo-50 focus:bg-indigo-50 data-[state=checked]:bg-indigo-50 data-[state=checked]:text-indigo-700">
                          <div className="flex items-center justify-between w-full gap-6">
                            <span>{e.label}</span>
                            <span className="inline-flex items-center gap-1">
                              {[0, 1, 2, 3].map(i => <span key={i} className={`h-1.5 w-2.5 rounded-full ${i < ((e.metadata as Record<string, number>)?.filled ?? 1) ? 'bg-indigo-500' : 'bg-slate-200'}`} />)}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                      <SelectItem value="custom" className="rounded-xl py-2.5 px-3 cursor-pointer text-xs font-semibold text-indigo-500 hover:bg-indigo-50 focus:bg-indigo-50">
                        + Type Custom Experience
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {vacancyForm.experience === "custom" && (
                    <Input
                      className="mt-1 h-8 text-xs rounded-lg"
                      value={vacancyForm.customExperience}
                      onChange={e => setVacancyForm({ ...vacancyForm, customExperience: e.target.value })}
                      placeholder="e.g. 1-3 Years"
                    />
                  )}
                </div>

                {/* Hiring Location */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">Hiring Location (Office Target)</label>
                  <Select
                    value={vacancyForm.hiringLocation}
                    onValueChange={v => setVacancyForm({ ...vacancyForm, hiringLocation: v })}
                  >
                    <SelectTrigger className="h-9 rounded-lg border-slate-200 bg-white w-full text-xs font-semibold text-slate-700 focus:ring-1 focus:ring-indigo-500">
                      <SelectValue placeholder="Select Hiring Location" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-slate-200 shadow-xl p-1" position="popper" sideOffset={6}>
                      {hiringLocations.map(h => (
                        <SelectItem key={h.id} value={h.value} className="rounded-xl py-2.5 px-3 cursor-pointer text-xs font-semibold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 focus:bg-indigo-50 data-[state=checked]:bg-indigo-50 data-[state=checked]:text-indigo-700">
                          {h.label}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom" className="rounded-xl py-2.5 px-3 cursor-pointer text-xs font-semibold text-indigo-500 hover:bg-indigo-50 focus:bg-indigo-50">
                        + Type Custom Location
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {vacancyForm.hiringLocation === "custom" && (
                    <Input
                      className="mt-1 h-8 text-xs rounded-lg"
                      value={vacancyForm.customHiringLocation}
                      onChange={e => setVacancyForm({ ...vacancyForm, customHiringLocation: e.target.value })}
                      placeholder="e.g. Pune"
                    />
                  )}
                </div>

                {/* Test Location Array Checkbox selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">Exam Test Venues (Select 1 or more)</label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-150 max-h-[120px] overflow-y-auto">
                    {testLocations.map(tl => (
                      <label key={tl.id} className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={vacancyForm.testLocations.includes(tl.value)}
                          onChange={e => {
                            const checked = e.target.checked
                            setVacancyForm(prev => {
                              const list = checked
                                ? [...prev.testLocations, tl.value]
                                : prev.testLocations.filter(val => val !== tl.value)
                              return { ...prev, testLocations: list }
                            })
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer"
                        />
                        {tl.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Openings */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-600">No. of Openings (Available Vacancies)</label>
                  <Input
                    className="h-9 text-xs rounded-lg"
                    value={vacancyForm.openings}
                    onChange={e => setVacancyForm({ ...vacancyForm, openings: e.target.value })}
                    type="number"
                    min="1"
                    placeholder="1"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={createConfigMutation.isPending}
                  className="group w-full h-11 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-semibold shadow-md transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:from-indigo-700 hover:to-violet-700 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {createConfigMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 transition-transform duration-300 group-hover:rotate-90" />
                  )}
                  {createConfigMutation.isPending ? "Publishing..." : "Publish Vacancy"}
                </Button>
              </form>
            </div>

          </div>

          {/* 2. Master Data Management lists */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 mb-4 gap-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-slate-100 text-slate-600 rounded-lg">
                  <Settings className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Master Data Configuration</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Add, toggle, or delete dynamic items used in vacancy selections.</p>
                </div>
              </div>

              {/* Master lists tabs */}
              <div className="flex gap-1 border border-slate-200 bg-slate-50/50 p-1 rounded-xl">
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
                      "px-3 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer",
                      activeMasterTab === tab.key
                        ? "bg-white text-indigo-700 shadow-xs border border-slate-150"
                        : "text-slate-400 hover:text-slate-600"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content of Selected Master Tab */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">

              {/* Left Form: Add Master Option */}
              <div className="md:col-span-1 rounded-xl bg-slate-50/50 p-4 border border-slate-150 space-y-3 font-semibold text-slate-650 text-xs">
                <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">Add Master Option</h4>

                {activeMasterTab === "role" && (
                  <div className="space-y-3">
                    <label className="block space-y-1">
                      Role Name
                      <Input
                        className="mt-1 h-9 bg-white text-xs rounded-lg"
                        value={masterRoleForm.label}
                        onChange={e => setMasterRoleForm({ label: e.target.value, value: e.target.value })}
                        placeholder="e.g. NextJS Developer"
                      />
                    </label>
                    <label className="block space-y-1">
                      Database value identifier
                      <Input
                        className="mt-1 h-9 bg-white text-xs rounded-lg font-mono text-[11px]"
                        value={masterRoleForm.value}
                        onChange={e => setMasterRoleForm({ ...masterRoleForm, value: e.target.value })}
                        placeholder="e.g. nextjs_developer"
                      />
                    </label>
                    <Button onClick={() => handleAddMaster("role", masterRoleForm)} className="w-full bg-slate-700 hover:bg-slate-800 text-white h-9 rounded-lg cursor-pointer">
                      Add to Master Roles
                    </Button>
                  </div>
                )}

                {activeMasterTab === "experience" && (
                  <div className="space-y-3">
                    <label className="block space-y-1">
                      Display label
                      <Input
                        className="mt-1 h-9 bg-white text-xs rounded-lg"
                        value={masterExpForm.label}
                        onChange={e => setMasterExpForm({ ...masterExpForm, label: e.target.value })}
                        placeholder="e.g. 1–3 Years"
                      />
                    </label>
                    <label className="block space-y-1">
                      Database value identifier
                      <Input
                        className="mt-1 h-9 bg-white text-xs rounded-lg font-mono text-[11px]"
                        value={masterExpForm.value}
                        onChange={e => setMasterExpForm({ ...masterExpForm, value: e.target.value })}
                        placeholder="e.g. 1-3"
                      />
                    </label>
                    <label className="block space-y-1">
                      Progress Dots
                      <Select
                        value={masterExpForm.filledDots}
                        onValueChange={v => setMasterExpForm({ ...masterExpForm, filledDots: v })}
                      >
                        <SelectTrigger className="mt-1 h-9 rounded-lg border-slate-200 bg-white w-full text-xs font-semibold text-slate-700 focus:ring-1 focus:ring-indigo-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl border-slate-200 shadow-xl p-1" position="popper" sideOffset={6}>
                          {[["1", "Junior"], ["2", "Mid"], ["3", "Senior"], ["4", "Lead"]].map(([val, lbl], idx) => (
                            <SelectItem key={val} value={val} className="rounded-xl py-2.5 px-3 cursor-pointer text-xs font-semibold text-slate-700 hover:bg-indigo-50 focus:bg-indigo-50 data-[state=checked]:bg-indigo-50 data-[state=checked]:text-indigo-700">
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
                    <Button onClick={() => handleAddMaster("experience", masterExpForm)} className="w-full bg-slate-700 hover:bg-slate-800 text-white h-9 rounded-lg cursor-pointer">
                      Add to Master Experiences
                    </Button>
                  </div>
                )}

                {activeMasterTab === "hiring_location" && (
                  <div className="space-y-3">
                    <label className="block space-y-1">
                      Location Name
                      <Input
                        className="mt-1 h-9 bg-white text-xs rounded-lg"
                        value={masterHiringForm.label}
                        onChange={e => setMasterHiringForm({ label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
                        placeholder="e.g. Pune"
                      />
                    </label>
                    <label className="block space-y-1">
                      Database value identifier
                      <Input
                        className="mt-1 h-9 bg-white text-xs rounded-lg font-mono text-[11px]"
                        value={masterHiringForm.value}
                        onChange={e => setMasterHiringForm({ ...masterHiringForm, value: e.target.value })}
                        placeholder="e.g. pune"
                      />
                    </label>
                    <Button onClick={() => handleAddMaster("hiring_location", masterHiringForm)} className="w-full bg-slate-700 hover:bg-slate-800 text-white h-9 rounded-lg cursor-pointer">
                      Add to Hiring Locations
                    </Button>
                  </div>
                )}

                {activeMasterTab === "test_location" && (
                  <div className="space-y-3">
                    <label className="block space-y-1">
                      Test Venue Name
                      <Input
                        className="mt-1 h-9 bg-white text-xs rounded-lg"
                        value={masterTestForm.label}
                        onChange={e => setMasterTestForm({ label: e.target.value, value: e.target.value.toLowerCase().replace(/\s+/g, "_") })}
                        placeholder="e.g. Pune Office"
                      />
                    </label>
                    <label className="block space-y-1">
                      Database value identifier
                      <Input
                        className="mt-1 h-9 bg-white text-xs rounded-lg font-mono text-[11px]"
                        value={masterTestForm.value}
                        onChange={e => setMasterTestForm({ ...masterTestForm, value: e.target.value })}
                        placeholder="e.g. pune_office"
                      />
                    </label>
                    <Button onClick={() => handleAddMaster("test_location", masterTestForm)} className="w-full bg-slate-700 hover:bg-slate-800 text-white h-9 rounded-lg cursor-pointer">
                      Add to Test Venues
                    </Button>
                  </div>
                )}

              </div>

              {/* Right Table: Master List Options */}
              <div className="md:col-span-2 overflow-y-auto max-h-[360px] border border-slate-150 rounded-xl bg-slate-50/10">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/50 text-slate-500 font-bold border-b border-slate-200">
                      <th className="px-4 py-2.5">Display Option</th>
                      <th className="px-4 py-2.5 font-mono">DB value</th>
                      <th className="px-4 py-2.5 text-center">Status</th>
                      <th className="px-4 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 bg-white">
                    {(activeMasterTab === "role" ? allRoles
                      : activeMasterTab === "experience" ? allExperiences
                        : activeMasterTab === "hiring_location" ? allHiringLocations
                          : allTestLocations
                    ).map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/45 transition-colors">
                        <td className="px-4 py-3">
                          {editingId === item.id ? (
                            <div className="space-y-1.5 max-w-[200px]">
                              <Input
                                className="h-8 text-xs rounded-md"
                                value={editForm.label}
                                onChange={e => setEditForm({ ...editForm, label: e.target.value })}
                              />
                              {activeMasterTab === "experience" && (
                                <Select
                                  value={editForm.filledDots}
                                  onValueChange={v => setEditForm({ ...editForm, filledDots: v })}
                                >
                                  <SelectTrigger className="h-8 rounded-lg border-slate-200 bg-white w-full text-xs font-semibold text-slate-700 focus:ring-1 focus:ring-indigo-500">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="rounded-2xl border-slate-200 shadow-xl p-1" position="popper" sideOffset={6}>
                                    {[["1", "Junior"], ["2", "Mid"], ["3", "Senior"], ["4", "Lead"]].map(([val, lbl], idx) => (
                                      <SelectItem key={val} value={val} className="rounded-xl py-2 px-3 cursor-pointer text-xs font-semibold text-slate-700 hover:bg-indigo-50 focus:bg-indigo-50 data-[state=checked]:bg-indigo-50 data-[state=checked]:text-indigo-700">
                                        <div className="flex items-center justify-between w-full gap-4">
                                          <span>{lbl}</span>
                                          <span className="inline-flex items-center gap-1">
                                            {[0, 1, 2, 3].map(i => <span key={i} className={`h-1.5 w-2.5 rounded-full ${i <= idx ? 'bg-indigo-500' : 'bg-slate-200'}`} />)}
                                          </span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                              <div className="flex gap-1.5 pt-0.5">
                                <Button size="icon" className="h-6 w-6 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer" onClick={() => handleSaveMasterEdit(item.id, activeMasterTab)}>
                                  <Check className="h-3 w-3" />
                                </Button>
                                <Button size="icon" variant="outline" className="h-6 w-6 rounded-md cursor-pointer" onClick={() => setEditingId(null)}>
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <p className="font-bold text-slate-800">{item.label}</p>
                              {item.type === "experience" && item.metadata && !!item.metadata.filled && (
                                <span className="inline-flex items-center gap-1 mt-1">
                                  <span className="text-[10px] text-slate-400 font-medium">Complexity level:</span>
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
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{item.value}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => toggleMasterActive(item)}
                            className="text-[10px] font-bold text-slate-400 hover:text-indigo-650 cursor-pointer flex items-center justify-center gap-0.5 mx-auto"
                          >
                            {item.is_active ? (
                              <span className="text-emerald-600 flex items-center font-bold"><ToggleRight className="h-4.5 w-4.5 text-emerald-500" /> Active</span>
                            ) : (
                              <span className="text-slate-400 flex items-center font-bold"><ToggleLeft className="h-4.5 w-4.5 text-slate-350" /> Inactive</span>
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button className="p-1 hover:bg-slate-100 text-slate-500 rounded-md cursor-pointer" onClick={() => startMasterEdit(item)}>
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button className="p-1 hover:bg-red-50 text-red-500 rounded-md cursor-pointer" onClick={() => handleDeleteMaster(item.id, activeMasterTab)}>
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

        </div>
      )}
    </div>
  )
}
