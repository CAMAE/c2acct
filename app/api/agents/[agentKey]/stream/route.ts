import { requireAdminApi } from "@/lib/agents/adminApiAuth";
import { getAuditSince } from "@/lib/agents/adminConsole";

export const dynamic = "force-dynamic";

const POLL_MS = 2000;

/**
 * SSE live action stream. Polls AgentAuditLogEntry every 2s for rows newer than
 * the last cursor and emits each as an `data:` event. `agentKey` of "_all"
 * streams across agents. Closes when the client disconnects.
 */
export async function GET(request: Request, { params }: { params: Promise<{ agentKey: string }> }) {
  const auth = await requireAdminApi();
  if (!auth.ok) return auth.response;

  const { agentKey } = await params;
  const scope = agentKey === "_all" ? undefined : agentKey;
  const url = new URL(request.url);
  let cursor: string | null = url.searchParams.get("since");

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      const stop = () => {
        closed = true;
      };
      request.signal.addEventListener("abort", stop);

      try {
        while (!closed) {
          const rows = await getAuditSince(cursor, scope, 50);
          for (const row of rows) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(row)}\n\n`));
            cursor = row.createdAt;
          }
          // keep-alive comment so proxies don't drop an idle stream
          controller.enqueue(encoder.encode(`: ping\n\n`));
          await new Promise((resolve) => setTimeout(resolve, POLL_MS));
        }
      } catch {
        // client gone or stream torn down
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-store",
      connection: "keep-alive",
    },
  });
}
