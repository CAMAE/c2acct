import {
  FIRM_CAPABILITY_DEFINITIONS,
  FIRM_TIER1_INSIGHT_CAPABILITY_RULES,
  getFirmModuleCapabilityKeys,
  getFirmQuestionCapabilityKeys,
} from "@/lib/firmCapabilities";
import {
  FIRM_MODULE_DEFINITIONS,
  FIRM_MODULE_QUESTION_STEMS,
  FIRM_TIER1_INSIGHT_DEFINITIONS,
} from "@/lib/firmPat";

function fail(message: string): never {
  throw new Error(message);
}

function main() {
  const capabilityKeySet = new Set(FIRM_CAPABILITY_DEFINITIONS.map((capability) => capability.key));

  if (FIRM_MODULE_QUESTION_STEMS.length !== 20) {
    fail(`Expected 20 canonical PAT firm question stems, found ${FIRM_MODULE_QUESTION_STEMS.length}.`);
  }

  for (const moduleDefinition of FIRM_MODULE_DEFINITIONS) {
    const moduleCapabilityKeys = getFirmModuleCapabilityKeys(moduleDefinition.sectionKey);
    if (moduleCapabilityKeys.length === 0) {
      fail(`Module ${moduleDefinition.key} has no module capability mapping.`);
    }

    for (const capabilityKey of moduleCapabilityKeys) {
      if (!capabilityKeySet.has(capabilityKey)) {
        fail(`Module ${moduleDefinition.key} references unknown capability ${capabilityKey}.`);
      }
    }

    for (let index = 0; index < FIRM_MODULE_QUESTION_STEMS.length; index += 1) {
      const questionCapabilityKeys = getFirmQuestionCapabilityKeys(moduleDefinition.sectionKey, index);
      if (questionCapabilityKeys.length === 0) {
        fail(`Question mapping missing for ${moduleDefinition.key} stem ${index + 1}.`);
      }

      for (const capabilityKey of questionCapabilityKeys) {
        if (!capabilityKeySet.has(capabilityKey)) {
          fail(
            `Question mapping for ${moduleDefinition.key} stem ${index + 1} references unknown capability ${capabilityKey}.`
          );
        }
      }
    }
  }

  for (const insight of FIRM_TIER1_INSIGHT_DEFINITIONS) {
    const rules =
      FIRM_TIER1_INSIGHT_CAPABILITY_RULES[
        insight.key as keyof typeof FIRM_TIER1_INSIGHT_CAPABILITY_RULES
      ];
    if (!rules) {
      fail(`Firm Pro insight ${insight.key} has no capability rule coverage.`);
    }

    for (const rule of rules) {
      if (!capabilityKeySet.has(rule.key)) {
        fail(`Firm Pro insight ${insight.key} references unknown capability rule key ${rule.key}.`);
      }
    }
  }

  console.log(
    `PASS check-capability-mappings: ${FIRM_MODULE_DEFINITIONS.length} firm modules, ${FIRM_MODULE_DEFINITIONS.length * FIRM_MODULE_QUESTION_STEMS.length} question-to-capability mappings, ${FIRM_TIER1_INSIGHT_DEFINITIONS.length} Pro insight rule sets.`
  );
}

main();
