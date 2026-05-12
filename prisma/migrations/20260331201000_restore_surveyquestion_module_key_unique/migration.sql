DELETE FROM "SurveyQuestionCapability"
WHERE "questionId" IN (
  SELECT id
  FROM (
    SELECT
      "id",
      ROW_NUMBER() OVER (
        PARTITION BY "moduleId", "key"
        ORDER BY "createdAt" ASC, "id" ASC
      ) AS duplicate_rank
    FROM "SurveyQuestion"
  ) ranked_questions
  WHERE ranked_questions.duplicate_rank > 1
);

DELETE FROM "SurveyQuestion"
WHERE "id" IN (
  SELECT id
  FROM (
    SELECT
      "id",
      ROW_NUMBER() OVER (
        PARTITION BY "moduleId", "key"
        ORDER BY "createdAt" ASC, "id" ASC
      ) AS duplicate_rank
    FROM "SurveyQuestion"
  ) ranked_questions
  WHERE ranked_questions.duplicate_rank > 1
);

CREATE UNIQUE INDEX "SurveyQuestion_moduleId_key_key" ON "SurveyQuestion"("moduleId", "key");
