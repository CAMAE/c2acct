import { z } from "zod";

export const FirmProductAssessmentSubmitSchema = z.object({
  productId: z.string().min(1),
  answers: z.record(z.string(), z.number().int().min(0).max(5)),
});
