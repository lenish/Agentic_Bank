export interface OutboxEvent {
  id: string;
  event_type: string;
  payload: unknown;
  created_at: Date;
  processed: boolean;
  processed_at?: Date;
}

export class OutboxService {
  private readonly events: OutboxEvent[] = [];

  publish(event: OutboxEvent): void {
    this.assertEvent(event);
    this.events.push(this.cloneEvent(event));
  }

  drain(): OutboxEvent[] {
    const now = new Date();
    const processedEvents: OutboxEvent[] = [];

    for (const event of this.events) {
      if (event.processed) {
        continue;
      }

      event.processed = true;
      event.processed_at = new Date(now.getTime());
      processedEvents.push(this.cloneEvent(event));
    }

    return processedEvents;
  }

  getUnprocessed(): OutboxEvent[] {
    return this.events.filter((event) => !event.processed).map((event) => this.cloneEvent(event));
  }

  private assertEvent(event: OutboxEvent): void {
    if (!event.id.trim()) {
      throw new Error("OUTBOX_EVENT_ID_REQUIRED");
    }

    if (!event.event_type.trim()) {
      throw new Error("OUTBOX_EVENT_TYPE_REQUIRED");
    }
  }

  private cloneEvent(event: OutboxEvent): OutboxEvent {
    return {
      ...event,
      created_at: new Date(event.created_at.getTime()),
      processed_at: event.processed_at ? new Date(event.processed_at.getTime()) : undefined,
    };
  }
}
