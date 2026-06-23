"use client";

import dynamic from "next/dynamic";

const ForwardMessageDialog = dynamic(
  () => import("@/components/chat/conversation/ForwardMessageDialog"),
);
const EditMessageDialog = dynamic(() =>
  import("@/components/chat/conversation/MessageDialogs").then((mod) => ({
    default: mod.EditMessageDialog,
  })),
);
const DeleteMessageDialog = dynamic(() =>
  import("@/components/chat/conversation/MessageDialogs").then((mod) => ({
    default: mod.DeleteMessageDialog,
  })),
);

export default function ChatConversationDialogs({
  cid,
  user,
  forwardOpen,
  setForwardOpen,
  forwardIds,
  doForward,
  editOpen,
  setEditOpen,
  editTarget,
  setEditTarget,
  saveEdit,
  deleteOpen,
  setDeleteOpen,
  deleteTarget,
  setDeleteTarget,
  bulkDeleteCount = 0,
  onDeleteDialogClose,
  deleteForEveryone,
  setDeleteForEveryone,
  confirmDelete,
}) {
  return (
    <>
      <ForwardMessageDialog
        open={forwardOpen}
        onOpenChange={setForwardOpen}
        currentConversationId={cid}
        forwardCount={forwardIds.length || 1}
        onSelect={(toId) => doForward(toId)}
      />

      <EditMessageDialog
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) setEditTarget(null);
        }}
        initialText={editTarget?.text || ""}
        onSave={saveEdit}
      />

      <DeleteMessageDialog
        open={deleteOpen}
        onOpenChange={(o) => {
          setDeleteOpen(o);
          if (!o) {
            setDeleteTarget(null);
            onDeleteDialogClose?.();
          }
        }}
        deleteCount={bulkDeleteCount}
        showDeleteForEveryone={Boolean(
          bulkDeleteCount <= 1 &&
            deleteTarget &&
            Number(deleteTarget.e2eVersion) === 0 &&
            String(deleteTarget.senderId?._id || deleteTarget.senderId) ===
              String(user?._id),
        )}
        deleteForEveryone={deleteForEveryone}
        onDeleteForEveryoneChange={setDeleteForEveryone}
        onConfirm={confirmDelete}
      />
    </>
  );
}
