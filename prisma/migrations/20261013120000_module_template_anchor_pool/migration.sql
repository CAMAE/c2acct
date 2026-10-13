-- anchor-pool (R66, 2026-10-13): the bank header's tagged anchor pool lives on the template.
--
-- ADDITIVE ONLY. One nullable JSONB column on ModuleTemplate. No existing column,
-- default, index, constraint or type is altered, renamed or dropped, and no row
-- is rewritten (anchorPool is NULL for every template imported before this box,
-- whose six isAnchor items keep serving exactly as they did).

-- AlterTable
ALTER TABLE "ModuleTemplate" ADD COLUMN "anchorPool" JSONB;
