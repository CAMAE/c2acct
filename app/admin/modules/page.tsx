import prisma from "@/lib/prisma";
import { AdminPageIntro, AdminPanel } from "@/app/components/admin/AdminShell";
import {
  MODULE_SCOPE_OPTIONS,
  QUESTION_INPUT_TYPE_OPTIONS,
  requireAdminSession,
} from "@/lib/adminControlPlane";
import {
  updateModuleAction,
  upsertModuleCapabilityAction,
  upsertQuestionCapabilityAction,
  upsertSectionAction,
  updateQuestionAction,
} from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function AdminModulesPage() {
  await requireAdminSession();
  const [modules, capabilityNodes] = await Promise.all([
    prisma.surveyModule.findMany({
      orderBy: { key: "asc" },
      include: {
        ModuleCapability: {
          include: {
            CapabilityNode: {
              select: { title: true },
            },
          },
          orderBy: { nodeId: "asc" },
        },
        SurveySection: {
          orderBy: { order: "asc" },
          include: {
            SurveyQuestion: {
              orderBy: { order: "asc" },
              include: {
                SurveyQuestionCapability: {
                  include: {
                    CapabilityNode: {
                      select: { title: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    }),
    prisma.capabilityNode.findMany({
      where: { active: true },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
  ]);

  return (
    <div className="space-y-8">
      <AdminPageIntro
        title="Modules"
        description="Manage modules, sections, question order and input types, plus module/question capability mappings."
      />

      <AdminPanel title="Assessment runtime management">
        <div className="grid gap-6">
          {modules.map((module) => (
            <div key={module.id} className="rounded-[24px] border border-[var(--shell-border)] bg-white/80 p-5">
              <form action={updateModuleAction} className="grid gap-4 xl:grid-cols-5">
                <input type="hidden" name="moduleId" value={module.id} />
                <input type="hidden" name="returnTo" value="/admin/modules" />
                <input name="title" defaultValue={module.title} className="pat-input" />
                <select name="scope" defaultValue={module.scope} className="pat-select">
                  {MODULE_SCOPE_OPTIONS.map((scope) => (
                    <option key={scope} value={scope}>
                      {scope}
                    </option>
                  ))}
                </select>
                <input name="weight" type="number" step="0.1" defaultValue={module.weight} className="pat-input" />
                <label className="flex items-center gap-2 rounded-[18px] border border-[var(--shell-border)] px-4 py-3 text-sm text-[var(--shell-muted)]">
                  <input type="checkbox" name="active" defaultChecked={module.active} />
                  Active
                </label>
                <button type="submit" className="pat-button-secondary">
                  Save module
                </button>
                <textarea
                  name="description"
                  defaultValue={module.description ?? ""}
                  className="pat-textarea xl:col-span-5"
                  rows={2}
                />
              </form>

              <form action={upsertModuleCapabilityAction} className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_0.6fr_auto]">
                <input type="hidden" name="moduleId" value={module.id} />
                <input type="hidden" name="returnTo" value="/admin/modules" />
                <select name="nodeId" defaultValue="" className="pat-select">
                  <option value="" disabled>
                    Add module capability
                  </option>
                  {capabilityNodes.map((node) => (
                    <option key={node.id} value={node.id}>
                      {node.title}
                    </option>
                  ))}
                </select>
                <input name="weight" type="number" step="0.1" defaultValue="1" className="pat-input" />
                <button type="submit" className="pat-button-primary">
                  Save mapping
                </button>
              </form>

              {module.ModuleCapability.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--shell-muted)]">
                  {module.ModuleCapability.map((mapping) => (
                    <span key={mapping.id} className="rounded-full border border-[var(--shell-border)] px-3 py-1.5">
                      {mapping.CapabilityNode.title} · w {mapping.weight}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-6 grid gap-4">
                {module.SurveySection.map((section) => (
                  <div key={section.id} className="rounded-[20px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-4">
                    <form action={upsertSectionAction} className="grid gap-3 xl:grid-cols-5">
                      <input type="hidden" name="sectionId" value={section.id} />
                      <input type="hidden" name="moduleId" value={module.id} />
                      <input type="hidden" name="returnTo" value="/admin/modules" />
                      <input type="hidden" name="key" value={section.key} />
                      <input name="title" defaultValue={section.title} className="pat-input" />
                      <input name="order" type="number" defaultValue={section.order} className="pat-input" />
                      <input name="utilityKey" defaultValue={section.utilityKey ?? ""} placeholder="utilityKey" className="pat-input" />
                      <input name="subcategoryKey" defaultValue={section.subcategoryKey ?? ""} placeholder="subcategoryKey" className="pat-input" />
                      <button type="submit" className="pat-button-secondary">
                        Save section
                      </button>
                      <textarea name="description" defaultValue={section.description ?? ""} rows={2} className="pat-textarea xl:col-span-5" />
                    </form>

                    <div className="mt-4 grid gap-3">
                      {section.SurveyQuestion.map((question) => (
                        <div key={question.id} className="rounded-[18px] border border-[var(--shell-border)] bg-white/80 p-4">
                          <form action={updateQuestionAction} className="grid gap-3 xl:grid-cols-6">
                            <input type="hidden" name="questionId" value={question.id} />
                            <input type="hidden" name="returnTo" value="/admin/modules" />
                            <textarea name="prompt" defaultValue={question.prompt} rows={2} className="pat-textarea xl:col-span-6" />
                            <input name="order" type="number" defaultValue={question.order} className="pat-input" />
                            <input name="weight" type="number" step="0.1" defaultValue={question.weight} className="pat-input" />
                            <select name="inputType" defaultValue={question.inputType} className="pat-select">
                              {QUESTION_INPUT_TYPE_OPTIONS.map((inputType) => (
                                <option key={inputType} value={inputType}>
                                  {inputType}
                                </option>
                              ))}
                            </select>
                            <select name="sectionId" defaultValue={question.sectionId ?? section.id} className="pat-select">
                              {module.SurveySection.map((candidateSection) => (
                                <option key={candidateSection.id} value={candidateSection.id}>
                                  {candidateSection.title}
                                </option>
                              ))}
                            </select>
                            <label className="flex items-center gap-2 rounded-[18px] border border-[var(--shell-border)] px-4 py-3 text-sm text-[var(--shell-muted)]">
                              <input type="checkbox" name="required" defaultChecked={question.required} />
                              Required
                            </label>
                            <button type="submit" className="pat-button-secondary">
                              Save question
                            </button>
                          </form>

                          <form action={upsertQuestionCapabilityAction} className="mt-3 grid gap-3 xl:grid-cols-[1.2fr_0.6fr_auto]">
                            <input type="hidden" name="questionId" value={question.id} />
                            <input type="hidden" name="returnTo" value="/admin/modules" />
                            <select name="nodeId" defaultValue="" className="pat-select">
                              <option value="" disabled>
                                Add question capability
                              </option>
                              {capabilityNodes.map((node) => (
                                <option key={node.id} value={node.id}>
                                  {node.title}
                                </option>
                              ))}
                            </select>
                            <input name="weight" type="number" step="0.1" defaultValue="1" className="pat-input" />
                            <button type="submit" className="pat-button-primary">
                              Save mapping
                            </button>
                          </form>

                          {question.SurveyQuestionCapability.length > 0 ? (
                            <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--shell-muted)]">
                              {question.SurveyQuestionCapability.map((mapping) => (
                                <span key={mapping.id} className="rounded-full border border-[var(--shell-border)] px-3 py-1.5">
                                  {mapping.CapabilityNode.title} · w {mapping.weight}
                                </span>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <form action={upsertSectionAction} className="mt-5 grid gap-3 xl:grid-cols-5">
                <input type="hidden" name="moduleId" value={module.id} />
                <input type="hidden" name="returnTo" value="/admin/modules" />
                <input name="key" placeholder="new_section_key" className="pat-input" />
                <input name="title" placeholder="New section title" className="pat-input" />
                <input name="order" type="number" defaultValue={module.SurveySection.length + 1} className="pat-input" />
                <input name="utilityKey" placeholder="utilityKey" className="pat-input" />
                <button type="submit" className="pat-button-primary">
                  Add section
                </button>
                <textarea name="description" rows={2} placeholder="Section description" className="pat-textarea xl:col-span-5" />
              </form>
            </div>
          ))}
        </div>
      </AdminPanel>
    </div>
  );
}
