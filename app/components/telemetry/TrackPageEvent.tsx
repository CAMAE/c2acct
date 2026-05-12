"use client";

import { useEffect } from "react";
import { trackClientEvent, type PatAnalyticsEvent } from "@/lib/analytics";

type TrackPageEventProps = {
  distinctId: string;
  event: PatAnalyticsEvent;
  properties?: Record<string, unknown>;
};

export default function TrackPageEvent({ distinctId, event, properties }: TrackPageEventProps) {
  useEffect(() => {
    void trackClientEvent({
      distinctId,
      event,
      properties,
    });
  }, [distinctId, event, properties]);

  return null;
}
