import { cn } from "@/lib/classNames";
import { countReceiptUsers } from "@/lib/messageFormat";

export default function ReadReceipt({
  m,
  isMine,
  meId,
  peerUserId,
  isGroupChat,
  groupRecipientCount,
  readReceiptsEnabled = true,
  t,
}) {
  if (!isMine || !meId) return null;
  if (m.deletedForEveryone) return null;
  if (!isGroupChat && readReceiptsEnabled === false) return null;
  if (isGroupChat && groupRecipientCount > 0) {
    const d = countReceiptUsers(m.deliveredTo);
    const s = countReceiptUsers(m.seenBy);
    const max = groupRecipientCount;
    const allRead = s >= max;
    const someDelivered = d > 0 || s > 0;
    const title = t("groupReceiptTitle", { delivered: d, read: s, total: max });
    return (
      <span
        className={cn(
          "ml-1 inline-flex items-center gap-0.5 text-[10px]",
          allRead
            ? "font-medium text-brand-100 dark:text-brand-200"
            : "opacity-80"
        )}
        title={title}
      >
        {allRead ? "✓✓" : someDelivered ? "✓✓" : "✓"}
        <span className="tabular-nums">
          {s}/{max}
        </span>
      </span>
    );
  }
  if (isGroupChat) {
    return (
      <span className="ml-1 text-[10px] opacity-75" title={t("readSentServer")}>
        ✓
      </span>
    );
  }
  const pid = peerUserId ? String(peerUserId) : null;
  const seen =
    pid &&
    (m.seenBy || []).some((s) => String(s.user?._id || s.user) === pid);
  const delivered =
    pid &&
    (m.deliveredTo || []).some(
      (d) => String(d.user?._id || d.user) === pid
    );
  if (seen) {
    return (
      <span
        className="ml-1 text-[10px] font-medium text-brand-100 dark:text-brand-200"
        title={t("readRead")}
      >
        ✓✓
      </span>
    );
  }
  if (delivered) {
    return (
      <span
        className="ml-1 text-[10px] opacity-90"
        title={t("readDeliveredToDevice")}
      >
        ✓✓
      </span>
    );
  }
  return (
    <span className="ml-1 text-[10px] opacity-75" title={t("readSentServer")}>
      ✓
    </span>
  );
}
