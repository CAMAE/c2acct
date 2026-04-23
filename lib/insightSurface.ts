export type InsightSurfaceItem = {
  title: string;
  body: string;
};

export type InsightSurfaceContent<Key extends string = string> = {
  key: Key;
  title: string;
  intro: string;
  items: InsightSurfaceItem[];
};

type HelpSurfaceContentInput<Key extends string> = {
  key?: Key;
  title?: string;
  intro: string;
  what: string;
  why: string;
  how: string;
};

type ElitePlaceholderSurfaceContentInput<Key extends string> = {
  key?: Key;
  title?: string;
  intro: string;
  what: string;
  why: string;
  how: string;
};

export function buildHelpSurfaceContent<Key extends string = "help">(
  input: HelpSurfaceContentInput<Key>
): InsightSurfaceContent<Key> {
  return {
    key: (input.key ?? ("help" as Key)),
    title: input.title ?? "Help",
    intro: input.intro,
    items: [
      {
        title: "What it is",
        body: input.what,
      },
      {
        title: "Why it matters",
        body: input.why,
      },
      {
        title: "How to use it",
        body: input.how,
      },
    ],
  };
}

export function buildElitePlaceholderSurfaceContent<Key extends string = "elite">(
  input: ElitePlaceholderSurfaceContentInput<Key>
): InsightSurfaceContent<Key> {
  return {
    key: (input.key ?? ("elite" as Key)),
    title: input.title ?? "Elite",
    intro: input.intro,
    items: [
      {
        title: "What it is",
        body: input.what,
      },
      {
        title: "Why it matters",
        body: input.why,
      },
      {
        title: "How to use it",
        body: input.how,
      },
    ],
  };
}
