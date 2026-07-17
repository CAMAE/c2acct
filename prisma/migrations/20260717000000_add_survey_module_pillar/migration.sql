-- 15a: pillar badge column on SurveyModule + backfill the five firm alignment modules.
ALTER TABLE "SurveyModule" ADD COLUMN "pillarName" TEXT;

UPDATE "SurveyModule" SET "pillarName" = 'Operations' WHERE "key" = 'firm_alignment_operating_model_v1';
UPDATE "SurveyModule" SET "pillarName" = 'Automation' WHERE "key" = 'firm_alignment_automation_ai_v1';
UPDATE "SurveyModule" SET "pillarName" = 'Integration' WHERE "key" = 'firm_alignment_data_flow_v1';
UPDATE "SurveyModule" SET "pillarName" = 'Governance' WHERE "key" = 'firm_alignment_governance_v1';
UPDATE "SurveyModule" SET "pillarName" = 'Strategy'    WHERE "key" = 'firm_alignment_strategy_v1';
