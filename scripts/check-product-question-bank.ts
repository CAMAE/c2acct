import {
  PRODUCT_GENERAL_MODULE,
  PRODUCT_GENERAL_QUESTION_COUNT,
  PRODUCT_OPEN_ENDED_MODULE,
  PRODUCT_OPEN_ENDED_QUESTION_COUNT,
  PRODUCT_SCORED_QUESTIONS_PER_SUBCATEGORY,
  PRODUCT_UTILITY_REGISTRY,
  PRODUCT_UTILITY_SCORED_QUESTION_COUNT,
} from "@/lib/productUtilityRegistry";

function fail(message: string): never {
  throw new Error(message);
}

for (const utility of PRODUCT_UTILITY_REGISTRY) {
  if (utility.subcategories.length === 0) {
    fail(`Utility ${utility.key} has no subcategories.`);
  }

  if (utility.subcategories.length !== 4) {
    fail(`Utility ${utility.key} must have 4 subcategories, found ${utility.subcategories.length}.`);
  }

  const questionCount = utility.subcategories.reduce(
    (sum, subcategory) => sum + subcategory.questions.length,
    0
  );

  if (questionCount !== PRODUCT_UTILITY_SCORED_QUESTION_COUNT) {
    fail(
      `Utility ${utility.key} must have ${PRODUCT_UTILITY_SCORED_QUESTION_COUNT} scored questions total, found ${questionCount}.`
    );
  }

  for (const subcategory of utility.subcategories) {
    if (subcategory.questions.length !== PRODUCT_SCORED_QUESTIONS_PER_SUBCATEGORY) {
      fail(
        `Subcategory ${utility.key}/${subcategory.key} must have ${PRODUCT_SCORED_QUESTIONS_PER_SUBCATEGORY} scored questions, found ${subcategory.questions.length}.`
      );
    }
  }
}

if (PRODUCT_GENERAL_MODULE.questions.length !== PRODUCT_GENERAL_QUESTION_COUNT) {
  fail(
    `Product general module must have ${PRODUCT_GENERAL_QUESTION_COUNT} questions, found ${PRODUCT_GENERAL_MODULE.questions.length}.`
  );
}

if (PRODUCT_OPEN_ENDED_MODULE.questions.length !== PRODUCT_OPEN_ENDED_QUESTION_COUNT) {
  fail(
    `Product open-ended module must have ${PRODUCT_OPEN_ENDED_QUESTION_COUNT} questions, found ${PRODUCT_OPEN_ENDED_MODULE.questions.length}.`
  );
}

console.log(
  `Product question bank OK: ${PRODUCT_UTILITY_REGISTRY.length} utilities, ` +
    `${PRODUCT_UTILITY_REGISTRY.reduce((sum, utility) => sum + utility.subcategories.length, 0)} subcategories, ` +
    `${PRODUCT_GENERAL_QUESTION_COUNT} general questions, ${PRODUCT_OPEN_ENDED_QUESTION_COUNT} open-ended questions.`
);
