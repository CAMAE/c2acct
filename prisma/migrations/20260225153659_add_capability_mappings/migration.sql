-- CreateTable
CREATE TABLE "SurveyQuestionCapability" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SurveyQuestionCapability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModuleCapability" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ModuleCapability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SurveyQuestionCapability_questionId_idx" ON "SurveyQuestionCapability"("questionId");

-- CreateIndex
CREATE INDEX "SurveyQuestionCapability_nodeId_idx" ON "SurveyQuestionCapability"("nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyQuestionCapability_questionId_nodeId_key" ON "SurveyQuestionCapability"("questionId", "nodeId");

-- CreateIndex
CREATE INDEX "ModuleCapability_moduleId_idx" ON "ModuleCapability"("moduleId");

-- CreateIndex
CREATE INDEX "ModuleCapability_nodeId_idx" ON "ModuleCapability"("nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleCapability_moduleId_nodeId_key" ON "ModuleCapability"("moduleId", "nodeId");

-- AddForeignKey
ALTER TABLE "SurveyQuestionCapability" ADD CONSTRAINT "SurveyQuestionCapability_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "SurveyQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyQuestionCapability" ADD CONSTRAINT "SurveyQuestionCapability_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "CapabilityNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleCapability" ADD CONSTRAINT "ModuleCapability_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "SurveyModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModuleCapability" ADD CONSTRAINT "ModuleCapability_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "CapabilityNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
