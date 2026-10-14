import { loadAdminModulesCatalog } from "@/lib/adminCatalogQueries";
import { ANCHOR_TIERS } from "@/lib/assessmentCore";
import { listAdminAnchorPools } from "@/lib/modules/anchorPoolAdmin";
import { AdminPageIntro, AdminPanel } from "@/app/components/admin/AdminShell";
import { MODULE_SCOPE_OPTIONS, QUESTION_INPUT_TYPE_OPTIONS } from "@/lib/adminControlPlane";
import {
  updateModuleAction,
  upsertModuleCapabilityAction,
  upsertQuestionCapabilityAction,
  upsertSectionAction,
  updateQuestionAction,
} from "@/app/(app)/admin/actions";

export const dynamic = "force-dynamic";

export default async function AdminModulesPage() {
  const { modules, capabilityNodes } = await loadAdminModulesCatalog();
  // anchor-pool (R66, item 6): read-only grid per knowledge bank; no control is added.
  const anchorPools = await listAdminAnchorPools();
  const tierWord = { E: "Easy", M: "Moderate", H: "Hard" } as const;

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

      <AdminPanel title="Anchor pool per bank">
        <p className="text-sm leading-6 text-[var(--shell-muted)]">
          Six drivers by three tiers per knowledge bank, read from the bank header. Six serve per sitting, one per driver, at 2 Easy, 3
          Moderate, 1 Hard. An empty cell is a cell to author. A bank with an untagged header serves the six it names, with no driver.
        </p>
        {anchorPools.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--shell-muted)]">No knowledge bank is imported on this database.</p>
        ) : (
          <div className="mt-6 grid gap-6">
            {anchorPools.map((bank) => (
              <div key={bank.key} className="rounded-2xl border border-[var(--shell-border)] bg-white/80 p-5">
                <div className="text-sm font-semibold text-[var(--shell-ink)]">{bank.title}</div>
                <div className="mt-1 text-xs text-[var(--shell-muted)]">
                  {bank.key} · {bank.reviewStatus} · {bank.verticalId} · {bank.itemCount} items · {bank.grid.tagged ? "tagged header" : "untagged header"} ·{" "}
                  {bank.grid.filledCells} of 18 cells filled
                </div>
                {bank.grid.tagged ? (
                  <table className="mt-4 w-full max-w-xl text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-[var(--shell-muted)]">
                        <th className="py-1 pr-4 font-medium">Driver</th>
                        {ANCHOR_TIERS.map((tier) => (
                          <th key={tier} className="py-1 pr-4 font-medium">
                            {tierWord[tier]}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {bank.grid.rows.map((row) => (
                        <tr key={row.slot} className="border-t border-[var(--shell-border)]">
                          <td className="py-1.5 pr-4 font-medium text-[var(--shell-ink)]">{row.slot === "R" ? "Reserve" : row.slot}</td>
                          {ANCHOR_TIERS.map((tier) => (
                            <td key={tier} className={`py-1.5 pr-4 ${row.cells[tier] ? "text-[var(--shell-ink)]" : "text-[var(--shell-muted)]"}`}>
                              {row.cells[tier] ?? (row.slot === "R" ? "·" : "empty")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="mt-4 text-sm text-[var(--shell-muted)]">
                    Served six, no driver: {bank.anchorCodes.join(", ") || "none"}. Tag the header as code:driver:tier to place them.
                  </div>
                )}
                <div className="mt-3 text-xs text-[var(--shell-muted)]">
                  Served by rule: {bank.grid.served.served.map((cell) => cell.code).join(", ") || "none"} · Easy {bank.grid.served.tierCount.E},
                  Moderate {bank.grid.served.tierCount.M}, Hard {bank.grid.served.tierCount.H} against 2, 3, 1 · short Easy{" "}
                  {bank.grid.served.shortfall.E}, Moderate {bank.grid.served.shortfall.M}, Hard {bank.grid.served.shortfall.H} · drivers not covered:{" "}
                  {bank.grid.served.uncoveredDrivers.join(", ") || "none"}
                </div>
              </div>
            ))}
          </div>
        )}
      </AdminPanel>
    </div>
  );
}
