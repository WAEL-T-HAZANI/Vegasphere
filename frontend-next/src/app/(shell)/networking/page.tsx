"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { Search as SearchIcon } from "lucide-react";
import DashboardPageLayout from "@/components/layout/DashboardPageLayout";
import ProtectedPageGate from "@/components/layout/ProtectedPageGate";
import NetworkingCollabBoard, {
  type NetworkingPostItem,
} from "@/components/networking/NetworkingCollabBoard";
import NetworkingCloseDialog from "@/components/networking/NetworkingCloseDialog";
import NetworkingMatchCard, {
  type NetworkingMatch,
} from "@/components/networking/NetworkingMatchCard";
import NetworkingProfileForm from "@/components/networking/NetworkingProfileForm";
import {
  networkingClient,
  userClient,
} from "@/lib/clients";
import { formatApiError } from "@/lib/apiError";
import { openOrRequestDirectChat } from "@/lib/directChat";
import { cn } from "@/lib/classNames";
import {
  joinNetworkingTags,
  splitNetworkingTags,
} from "@/lib/networkingHub";
import { showAppToast } from "@/lib/appToast";
import { getSocket } from "@/lib/socket";
import { usePresenceBatch } from "@/hooks/usePresenceBatch";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

type NetworkingPayload = {
  profile?: Record<string, unknown> | null;
  recommendations?: NetworkingMatch[];
  posts?: NetworkingPostItem[];
  popularTags?: string[];
};

type IntroTone = "friendly" | "formal" | "short";

const NETWORKING_FILTER_KEY = "vs-networking-filters";

function readNetworkingFilter(key: "q" | "tag") {
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(`${NETWORKING_FILTER_KEY}:${key}`) || "";
  } catch {
    return "";
  }
}

export default function NetworkingPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const me = useAppSelector((s) => s.auth.user);
  const conversations = useAppSelector((s) => s.chat.conversations);
  const status = useAppSelector((s) => s.auth.status);
  const rtl = i18n.dir() === "rtl";

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [q, setQ] = useState(() => readNetworkingFilter("q"));
  const [activeTag, setActiveTag] = useState(() => readNetworkingFilter("tag"));
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [recommendations, setRecommendations] = useState<NetworkingMatch[]>([]);
  const [posts, setPosts] = useState<NetworkingPostItem[]>([]);
  const [popularTags, setPopularTags] = useState<string[]>([]);
  const [profileRevision, setProfileRevision] = useState(0);
  const profileBootstrappedRef = useRef(false);

  const [headline, setHeadline] = useState("");
  const [skills, setSkills] = useState("");
  const [interests, setInterests] = useState("");
  const [lookingFor, setLookingFor] = useState("");
  const [openToCollaborate, setOpenToCollaborate] = useState(false);

  const [showCreatePost, setShowCreatePost] = useState(false);
  const [editingPostId, setEditingPostId] = useState("");
  const [postTitle, setPostTitle] = useState("");
  const [postSummary, setPostSummary] = useState("");
  const [postTags, setPostTags] = useState("");
  const [postRoleNeeded, setPostRoleNeeded] = useState("");
  const [closePostId, setClosePostId] = useState("");

  const meId = me?._id ? String(me._id) : "";

  useEffect(() => {
    try {
      sessionStorage.setItem(`${NETWORKING_FILTER_KEY}:q`, q);
      sessionStorage.setItem(`${NETWORKING_FILTER_KEY}:tag`, activeTag);
    } catch {
      /* ignore */
    }
  }, [q, activeTag]);

  const load = useCallback(
    async ({ syncProfile = false }: { syncProfile?: boolean } = {}) => {
      setLoading(true);
      try {
        const { data } = await networkingClient.listNetworking<NetworkingPayload>({
          q: q.trim(),
          tag: activeTag.trim(),
        });
        if (syncProfile) {
          setProfile(data?.profile || null);
          setProfileRevision((v) => v + 1);
        }
        setRecommendations(Array.isArray(data?.recommendations) ? data.recommendations : []);
        setPosts(Array.isArray(data?.posts) ? data.posts : []);
        setPopularTags(Array.isArray(data?.popularTags) ? data.popularTags : []);
        setMsg("");
      } catch (error) {
        setMsg(formatApiError(error, t, "errorOccurred"));
      } finally {
        setLoading(false);
      }
    },
    [activeTag, q, t],
  );

  useEffect(() => {
    if (!meId) return;
    const timer = window.setTimeout(() => {
      void load({ syncProfile: !profileBootstrappedRef.current });
      profileBootstrappedRef.current = true;
    }, 260);
    return () => window.clearTimeout(timer);
  }, [load, meId, q, activeTag]);

  useEffect(() => {
    if (!profile) return;
    setHeadline(String(profile.networkingHeadline || ""));
    setSkills(joinNetworkingTags(profile.networkingSkills as string[] | undefined));
    setInterests(joinNetworkingTags(profile.networkingInterests as string[] | undefined));
    setLookingFor(String(profile.networkingLookingFor || ""));
    setOpenToCollaborate(Boolean(profile.networkingOpenToCollaborate));
  }, [profile, profileRevision]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !meId) return undefined;
    const onNetworkingUpdated = () => {
      void load();
    };
    socket.on("networking-updated", onNetworkingUpdated);
    return () => {
      socket.off("networking-updated", onNetworkingUpdated);
    };
  }, [load, meId]);

  const profileCompleteness = useMemo(() => {
    const checks = [
      headline.trim(),
      splitNetworkingTags(skills).length,
      splitNetworkingTags(interests).length,
      lookingFor.trim(),
      openToCollaborate,
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [headline, interests, lookingFor, openToCollaborate, skills]);

  const directChatUserIds = useMemo(() => {
    const set = new Set<string>();
    for (const conv of conversations || []) {
      if (conv.isGroup || conv.isChannel || conv.isSelfChat) continue;
      const members = conv.members || [];
      for (const member of members) {
        const id = String(typeof member === "object" ? member._id || member.id : member);
        if (id && id !== meId) set.add(id);
      }
    }
    return set;
  }, [conversations, meId]);

  const presenceIds = useMemo(
    () => recommendations.map((item) => String(item.user?._id || "")).filter(Boolean),
    [recommendations],
  );
  const { presenceById } = usePresenceBatch(presenceIds, { enabled: Boolean(meId) });

  const resetPostForm = () => {
    setPostTitle("");
    setPostSummary("");
    setPostTags("");
    setPostRoleNeeded("");
    setEditingPostId("");
    setShowCreatePost(false);
  };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      const { data } = await networkingClient.updateNetworkingProfile({
        headline,
        skills: splitNetworkingTags(skills),
        interests: splitNetworkingTags(interests),
        lookingFor,
        openToCollaborate,
      });
      setProfile(data as Record<string, unknown>);
      setProfileRevision((v) => v + 1);
      showAppToast({ id: "networking-profile", body: t("networkingProfileSaved") });
      await load({ syncProfile: false });
    } catch (error) {
      setMsg(formatApiError(error, t, "errorOccurred"));
    } finally {
      setBusy(false);
    }
  };

  const publishPost = async (event: React.FormEvent) => {
    event.preventDefault();
    const title = postTitle.trim();
    const summary = postSummary.trim();
    if (title.length < 3) {
      setMsg(t("networkingPostTitleTooShort"));
      return;
    }
    if (summary.length < 10) {
      setMsg(t("networkingPostSummaryTooShort"));
      return;
    }
    setBusy(true);
    setMsg("");
    try {
      if (editingPostId) {
        await networkingClient.updateNetworkingPost(editingPostId, {
          title,
          summary,
          tags: splitNetworkingTags(postTags),
          roleNeeded: postRoleNeeded.trim(),
        });
        showAppToast({ id: "networking-post-edit", body: t("networkingPostUpdated") });
      } else {
        await networkingClient.createNetworkingPost({
          title,
          summary,
          tags: splitNetworkingTags(postTags),
          roleNeeded: postRoleNeeded.trim(),
        });
        showAppToast({ id: "networking-post", body: t("networkingPostCreated") });
      }
      resetPostForm();
      await load({ syncProfile: false });
    } catch (error) {
      setMsg(formatApiError(error, t, "errorOccurred"));
    } finally {
      setBusy(false);
    }
  };

  const closePost = async (postId: string) => {
    if (!postId) return;
    setBusy(true);
    try {
      await networkingClient.closeNetworkingPost(postId);
      showAppToast({ id: "networking-post-close", body: t("networkingPostClosed") });
      await load({ syncProfile: false });
    } catch (error) {
      setMsg(formatApiError(error, t, "errorOccurred"));
    } finally {
      setBusy(false);
    }
  };

  const toggleInterest = async (postId: string) => {
    if (!postId) return;
    setBusy(true);
    try {
      const { data } = await networkingClient.toggleNetworkingPostInterest(postId);
      showAppToast({
        id: "networking-interest",
        body: data?.viewerInterested
          ? t("networkingInterestedDone")
          : t("networkingInterestedRemoved"),
      });
      await load({ syncProfile: false });
    } catch (error) {
      setMsg(formatApiError(error, t, "errorOccurred"));
    } finally {
      setBusy(false);
    }
  };

  const startEditPost = (post: NetworkingPostItem) => {
    setEditingPostId(String(post._id || ""));
    setPostTitle(String(post.title || ""));
    setPostSummary(String(post.summary || ""));
    setPostTags(joinNetworkingTags(post.tags));
    setPostRoleNeeded(String(post.roleNeeded || ""));
    setShowCreatePost(false);
  };

  const startChat = async (otherId: string) => {
    if (!meId || !otherId) return;
    setBusy(true);
    setMsg("");
    try {
      const result = await openOrRequestDirectChat({
        myUserId: meId,
        otherUserId: otherId,
        conversations,
        dispatch,
        t,
      });
      if (result.ok === false) {
        setMsg(result.error);
      } else if (result.kind === "opened") {
        router.push(`/chats/${result.conversationId}`);
      }
    } finally {
      setBusy(false);
    }
  };

  const generateIntro = async (targetUserId: string, tone: IntroTone) => {
    const { data } = await networkingClient.generateNetworkingIntro({
      targetUserId,
      context: lookingFor.trim(),
      tone,
      locale: i18n.resolvedLanguage || i18n.language || "en",
    });
    return String(data?.intro || "");
  };

  const copyIntro = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showAppToast({ id: "networking-intro-copy", body: t("networkingIntroCopied") });
    } catch {
      setMsg(t("copyFailed"));
    }
  };

  const blockUser = async (id: string) => {
    setBusy(true);
    try {
      await userClient.blockUser(id);
      setRecommendations((prev) =>
        prev.filter((item) => String(item.user?._id || "") !== id),
      );
      showAppToast({ id: "networking-block", body: t("blockUserDone") });
      await load({ syncProfile: false });
    } catch (error) {
      setMsg(formatApiError(error, t, "errorOccurred"));
    } finally {
      setBusy(false);
    }
  };

  const ignoreUser = async (id: string) => {
    setBusy(true);
    try {
      await userClient.ignoreUser(id);
      showAppToast({ id: "networking-ignore", body: t("contactIgnoreDone") });
      await load({ syncProfile: false });
    } catch (error) {
      setMsg(formatApiError(error, t, "errorOccurred"));
    } finally {
      setBusy(false);
    }
  };

  const reportUser = async (id: string) => {
    const reason = window.prompt(t("privacyReportReasonPlaceholder"));
    if (!reason || reason.trim().length < 4) {
      if (reason !== null) setMsg(t("privacyReportReasonShort"));
      return;
    }
    setBusy(true);
    try {
      await userClient.reportUser(id, reason.trim());
      showAppToast({ id: "networking-report", body: t("privacyReportSent") });
    } catch (error) {
      setMsg(formatApiError(error, t, "errorOccurred"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ProtectedPageGate titleKey="navNetworking" status={status} user={me}>
      <div className="vs-networking-page">
        <DashboardPageLayout
          variant="simple"
          title={t("networkingTitle")}
          description={t("networkingSubtitle")}
          maxWidth="6xl"
          headerExtra={
            <div className="relative" dir={rtl ? "rtl" : "ltr"}>
              <SearchIcon
                className="pointer-events-none absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted"
                aria-hidden
              />
              <input
                value={q}
                onChange={(event) => setQ(event.target.value)}
                className="vs-input min-h-10 w-full ps-10 text-start"
                placeholder={t("networkingSearchPlaceholder")}
                aria-label={t("networkingSearchPlaceholder")}
                dir={rtl ? "rtl" : "ltr"}
                maxLength={80}
              />
            </div>
          }
        >
          {msg ? (
            <div role="status" className="vs-muted-panel mb-5 text-sm leading-relaxed">
              {msg}
            </div>
          ) : null}

          <div className="grid gap-6 xl:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.4fr)]">
            <aside>
              <NetworkingProfileForm
                userId={meId}
                previewName={me?.name}
                previewUsername={me?.username}
                previewPic={me?.profilePic}
                headline={headline}
                skills={skills}
                interests={interests}
                lookingFor={lookingFor}
                openToCollaborate={openToCollaborate}
                completeness={profileCompleteness}
                busy={busy}
                onHeadlineChange={setHeadline}
                onSkillsChange={setSkills}
                onInterestsChange={setInterests}
                onLookingForChange={setLookingFor}
                onOpenToCollaborateChange={setOpenToCollaborate}
                onSubmit={(e) => void saveProfile(e)}
              />
            </aside>

            <div className="space-y-6">
              {popularTags.length ? (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTag("")}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                      !activeTag
                        ? "border-brand-300 bg-brand-50 text-brand-800 dark:border-brand-700 dark:bg-brand-900/30 dark:text-brand-200"
                        : "border-brand-200/50 bg-surface text-muted hover:bg-brand-50/60 dark:border-brand-800/40",
                    )}
                  >
                    {t("chatListFilterAll")}
                  </button>
                  {popularTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setActiveTag((prev) => (prev === tag ? "" : tag))}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                        activeTag === tag
                          ? "border-brand-300 bg-brand-50 text-brand-800 dark:border-brand-700 dark:bg-brand-900/30 dark:text-brand-200"
                          : "border-brand-200/50 bg-surface text-muted hover:bg-brand-50/60 dark:border-brand-800/40",
                      )}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              ) : null}

              <NetworkingCollabBoard
                posts={posts}
                currentUserId={meId}
                busy={busy}
                title={postTitle}
                summary={postSummary}
                tags={postTags}
                roleNeeded={postRoleNeeded}
                showCreateForm={showCreatePost}
                editingPostId={editingPostId}
                onTitleChange={setPostTitle}
                onSummaryChange={setPostSummary}
                onTagsChange={setPostTags}
                onRoleNeededChange={setPostRoleNeeded}
                onToggleCreateForm={() => {
                  if (showCreatePost) resetPostForm();
                  else setShowCreatePost(true);
                }}
                onSubmitPost={(e) => void publishPost(e)}
                onStartChat={(id) => void startChat(id)}
                onRequestClosePost={setClosePostId}
                onToggleInterest={(id) => void toggleInterest(id)}
                onStartEditPost={startEditPost}
                onCancelEdit={resetPostForm}
              />

              <section className="vs-settings-card space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-ink">
                      {t("networkingRecommendationsTitle")}
                    </h2>
                    <p className="mt-1 text-sm text-muted">{t("networkingRecommendationsHint")}</p>
                  </div>
                  <span className="vs-chip-current px-3 py-1 text-xs">
                    {t("networkingMatchCount", { count: recommendations.length })}
                  </span>
                </div>

                {loading ? (
                  <div className="h-28 animate-pulse rounded-3xl border border-brand-200/35 bg-brand-100/50 dark:border-brand-800/30 dark:bg-brand-900/25" />
                ) : recommendations.length ? (
                  <div className="grid gap-3 lg:grid-cols-2">
                    {recommendations.map((item) => {
                      const targetId = String(item.user?._id || "");
                      return (
                        <NetworkingMatchCard
                          key={targetId}
                          item={item}
                          viewerLookingFor={lookingFor}
                          actionsBusy={busy}
                          hasDirectChat={directChatUserIds.has(targetId)}
                          presenceById={presenceById}
                          onStartChat={(id) => void startChat(id)}
                          onCopyIntro={(text) => void copyIntro(text)}
                          onGenerateIntro={generateIntro}
                          onBlock={(id) => void blockUser(id)}
                          onIgnore={(id) => void ignoreUser(id)}
                          onReport={(id) => void reportUser(id)}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="vs-brand-dashed-empty px-5 py-10 text-center text-sm">
                    {t("networkingNoMatches")}
                  </div>
                )}
              </section>
            </div>
          </div>
        </DashboardPageLayout>
      </div>

      <NetworkingCloseDialog
        open={Boolean(closePostId)}
        onOpenChange={(open) => {
          if (!open) setClosePostId("");
        }}
        onConfirm={() => {
          if (closePostId) void closePost(closePostId);
        }}
      />
    </ProtectedPageGate>
  );
}
