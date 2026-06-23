"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MapPin } from "lucide-react";
import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";

type LiveRow = {
  userId?: string;
  conversationId?: string;
  lat?: number;
  lng?: number;
  label?: string;
};

type LiveLocationBarProps = {
  conversationId: string;
};

function mergeLiveRow(rows: LiveRow[], row: LiveRow | null | undefined) {
  if (!row?.userId) return rows;
  const uid = String(row.userId);
  const next = rows.filter((r) => String(r.userId) !== uid);
  if (Number.isFinite(Number(row.lat)) && Number.isFinite(Number(row.lng))) {
    next.push(row);
  }
  return next;
}

export default function LiveLocationBar({ conversationId }: LiveLocationBarProps) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<LiveRow[]>([]);

  const load = useCallback(async () => {
    if (!conversationId) return;
    try {
      const { data } = await api.get<LiveRow[]>(
        `/message/live-location/${conversationId}`,
      );
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setRows([]);
    }
  }, [conversationId]);

  useEffect(() => {
    void load();
    const fallback = setInterval(load, 60_000);
    return () => clearInterval(fallback);
  }, [load]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !conversationId) return;

    const onUpdate = (row: LiveRow) => {
      if (String(row?.conversationId || conversationId) !== String(conversationId)) {
        return;
      }
      setRows((prev) => mergeLiveRow(prev, row));
    };

    const onStop = (payload: { userId?: string; conversationId?: string }) => {
      if (String(payload?.conversationId || conversationId) !== String(conversationId)) {
        return;
      }
      const uid = String(payload?.userId || "");
      if (!uid) return;
      setRows((prev) => prev.filter((r) => String(r.userId) !== uid));
    };

    socket.on("live-location:update", onUpdate);
    socket.on("live-location:stop", onStop);
    return () => {
      socket.off("live-location:update", onUpdate);
      socket.off("live-location:stop", onStop);
    };
  }, [conversationId]);

  if (!rows.length) return null;

  return (
    <div className="border-b border-brand-200 bg-brand-50/80 px-4 py-2 vs-dark-brand-surface-soft">
      <div className="flex items-center gap-2 text-xs font-semibold text-brand-800 vs-dark-brand-text">
        <MapPin className="h-4 w-4 shrink-0" />
        {t("liveLocationActive")}
      </div>
      <ul className="mt-1 flex flex-wrap gap-2">
        {rows.map((r) => (
          <li key={String(r.userId)}>
            <a
              href={`https://www.google.com/maps?q=${r.lat},${r.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-brand-700 underline vs-dark-brand-text-muted"
            >
              {r.label || `${r.lat}, ${r.lng}`}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
