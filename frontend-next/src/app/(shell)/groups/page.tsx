"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import DashboardPageLayout from "@/components/layout/DashboardPageLayout";
import ProtectedPageGate from "@/components/layout/ProtectedPageGate";
import GroupCreateForm from "@/components/groups/GroupCreateForm";
import GroupsListSection from "@/components/groups/GroupsListSection";
import { conversationClient } from "@/lib/clients";
import { formatApiError } from "@/lib/apiError";
import { showAppToast } from "@/lib/appToast";
import {
  buildGroupMemberSuggestions,
  filterMyGroups,
} from "@/lib/groupsHub";
import { buildChatHref } from "@/lib/chatList";
import { syncConversations } from "@/lib/syncConversations";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type { ConversationMember } from "@/types/api";

export default function GroupsPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const status = useAppSelector((s) => s.auth.status);
  const conversations = useAppSelector((s) => s.chat.conversations);

  const createRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<ConversationMember[]>([]);

  const groups = useMemo(() => filterMyGroups(conversations), [conversations]);
  const memberSuggestions = useMemo(
    () => buildGroupMemberSuggestions(conversations, user?._id),
    [conversations, user?._id],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      await syncConversations(dispatch);
    } catch (error) {
      setMsg(formatApiError(error, t, "errorOccurred"));
    } finally {
      setLoading(false);
    }
  }, [dispatch, t]);

  useEffect(() => {
    if (!user?._id) return;
    void refresh();
  }, [refresh, user?._id]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMsg("");
    setBusy(true);
    try {
      const { data } = await conversationClient.createGroup({
        name: name.trim(),
        description: description.trim(),
        memberIds: selectedMembers.map((member) => member._id).filter(Boolean),
      });
      await refresh();
      setName("");
      setDescription("");
      setSelectedMembers([]);
      showAppToast({ id: "group-created", body: t("groupCreated") });
      if (data?._id) {
        router.push(buildChatHref(data._id, { isGroup: true }, { from: "groups" }));
      }
    } catch (error) {
      setMsg(formatApiError(error, t, "errorOccurred"));
    } finally {
      setBusy(false);
    }
  };

  const scrollToCreate = () => {
    createRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <ProtectedPageGate titleKey="navGroups" status={status} user={user}>
      <DashboardPageLayout
        variant="simple"
        title={t("navGroups")}
        description={t("groupsPageSubtitle")}
        maxWidth="5xl"
      >
        {msg ? (
          <div role="status" className="vs-muted-panel mb-5 text-start text-sm leading-relaxed">
            {msg}
          </div>
        ) : null}

        <div className="space-y-6" dir={i18n.dir()}>
          <GroupsListSection
            groups={groups}
            loading={loading}
            currentUserId={user?._id}
            onScrollToCreate={scrollToCreate}
          />
          <div ref={createRef}>
            <GroupCreateForm
              name={name}
              description={description}
              selectedMembers={selectedMembers}
              memberSuggestions={memberSuggestions}
              currentUserId={user?._id}
              busy={busy}
              onNameChange={setName}
              onDescriptionChange={setDescription}
              onMembersChange={setSelectedMembers}
              onSubmit={(e) => void submit(e)}
            />
          </div>
        </div>
      </DashboardPageLayout>
    </ProtectedPageGate>
  );
}
