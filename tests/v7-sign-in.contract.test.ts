import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { MEET_PAT_V7_SECTION_COUNT } from "@/lib/frontDoor";
import { SUPPORTED_LOCALES, getLocaleMessages } from "@/lib/locale";

/**
 * Block 21c/21d — the sign-in hub and its Meet PAT view under the V7 door. Both
 * ship DARK behind PAT_ENABLE_NEW_FRONT_DOOR; flag-off markup is byte-identical
 * (proved by rendered-HTML diff at commit time, pinned here at the source level).
 */
const ROOT = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");
const meetPat = read("app/components/pat/MeetPatContent.tsx");
const signIn = read("app/(public)/sign-in/page.tsx");

function meetPatChars(locale: (typeof SUPPORTED_LOCALES)[number]) {
  const m = getLocaleMessages(locale).meetPat;
  const hero = m.eyebrow.length + m.heroTitle.length + m.heroBody.length;
  const section = (s: { title: string; body: string }) => s.title.length + s.body.length;
  const full = hero + m.sections.reduce((a, s) => a + section(s), 0) + m.valueTitle.length + m.valueBody.length;
  const compact = hero + m.sections.slice(0, MEET_PAT_V7_SECTION_COUNT).reduce((a, s) => a + section(s), 0);
  return { full, compact };
}

describe("21c — Meet PAT under the V7 door is cut by at least 40%, by omission only", () => {
  it.each(SUPPORTED_LOCALES)("%s: the V7 copy is <= 60% of the full copy", (locale) => {
    const { full, compact } = meetPatChars(locale);
    expect(compact / full, `${locale}: ${compact}/${full}`).toBeLessThanOrEqual(0.6);
  });

  it("keeps the hero + the first two sections and drops 'How PAT grows' + the value block", () => {
    expect(MEET_PAT_V7_SECTION_COUNT).toBe(2);
    for (const locale of SUPPORTED_LOCALES) {
      const m = getLocaleMessages(locale).meetPat;
      expect(m.sections.length).toBe(3);
    }
    const v7 = meetPat.slice(meetPat.indexOf('if (variant === "v7")'), meetPat.indexOf("  return (\n    <div className=\"space-y-8\">"));
    expect(v7).toContain("messages.meetPat.sections.slice(0, MEET_PAT_V7_SECTION_COUNT)");
    expect(v7).toContain("messages.meetPat.heroTitle");
    expect(v7).toContain("messages.meetPat.heroBody");
    expect(v7).not.toContain("valueTitle");
    expect(v7).not.toContain("valueBody");
    // No re-voicing: the v7 branch introduces no copy of its own (only message lookups).
    expect(v7).not.toMatch(/>\s*[A-Z][a-z]+ [a-z]+[^<{]*</);
  });

  it("the default variant is untouched: all sections + the value block, same markup", () => {
    const dflt = meetPat.slice(meetPat.indexOf("  return (\n    <div className=\"space-y-8\">"));
    expect(dflt).toContain("{messages.meetPat.sections.map((section) => (");
    expect(dflt).toContain("{messages.meetPat.valueTitle}");
    expect(dflt).toContain("{pilotBody(messages.meetPat.valueBody)}");
    expect(meetPat).toMatch(/variant = "default" \}: MeetPatContentProps/);
  });

  it("the sign-in hub selects the variant from PAT_ENABLE_NEW_FRONT_DOOR and nothing else", () => {
    expect(signIn).toContain("<MeetPatInline v7={isNewFrontDoorEnabled()} />");
    expect(signIn).toMatch(/<MeetPatContent variant=\{v7 \? "v7" : "default"\} \/>/);
  });
});
