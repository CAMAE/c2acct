// Importing an agent module registers its handler in the in-process registry
// (see lib/agents/registry.ts). The supervisor imports this barrel once at
// startup so every handler is available before it dispatches a run.
//
// Phase 1 appends: import "./pilot-ops"; import "./cloudflare-watcher";
import "./hello-world";
import "./qa-smoke";
