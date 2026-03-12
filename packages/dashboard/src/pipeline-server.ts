import { Hono } from 'hono';
import type { PipelineStage } from './pipeline';

const STAGE_NAMES = [
  'Intent Parse',
  'Policy Check',
  'Risk Score',
  'Settlement Execute',
  'Audit Record',
] as const;

export function createPipelineServer() {
  const app = new Hono();

  app.get('/api/v1/pipeline/:paymentId/stream', (c) => {
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        for (const name of STAGE_NAMES) {
          await new Promise((r) => setTimeout(r, 50));
          const stage: PipelineStage = { name, status: 'DONE', elapsed_ms: Math.floor(Math.random() * 50) + 5 };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(stage)}\n\n`));
        }
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  });

  return app;
}
