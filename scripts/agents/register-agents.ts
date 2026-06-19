// Importing an agent module registers its handler in the in-process registry
// (see lib/agents/registry.ts). The supervisor imports this barrel once at
// startup so every handler is available before it dispatches a run.
//
import "./hello-world";
import "./qa-smoke";
import "./cloudflare-watcher";
import "./pilot-ops";
import "./internal-knowledge";
import "./ping-sweep";
