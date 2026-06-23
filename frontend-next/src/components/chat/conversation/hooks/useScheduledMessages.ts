"use client";

import { useState } from "react";

export function useScheduledMessages() {
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduledFor, setScheduledFor] = useState("");

  const resetSchedule = () => {
    setScheduleOpen(false);
    setScheduledFor("");
  };

  return {
    scheduleOpen,
    setScheduleOpen,
    scheduledFor,
    setScheduledFor,
    resetSchedule,
  };
}
