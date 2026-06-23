"use client";

import Link from "next/link";
import { Briefcase, Megaphone, Pencil, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/classNames";
import { networkingUserLabel } from "@/lib/networkingHub";

export type NetworkingPostItem = {
  _id?: string;
  title?: string;
  summary?: string;
  tags?: string[];
  roleNeeded?: string;
  status?: string;
  authorId?: string;
  interestedCount?: number;
  viewerInterested?: boolean;
  author?: {
    _id?: string;
    name?: string;
    username?: string;
    profilePic?: string;
  };
};

type NetworkingCollabBoardProps = {
  posts: NetworkingPostItem[];
  currentUserId?: string;
  busy: boolean;
  title: string;
  summary: string;
  tags: string;
  roleNeeded: string;
  showCreateForm: boolean;
  editingPostId?: string;
  onTitleChange: (_value: string) => void;
  onSummaryChange: (_value: string) => void;
  onTagsChange: (_value: string) => void;
  onRoleNeededChange: (_value: string) => void;
  onToggleCreateForm: () => void;
  onSubmitPost: (_event: React.FormEvent) => void;
  onStartChat: (_userId: string) => void;
  onRequestClosePost: (_postId: string) => void;
  onToggleInterest: (_postId: string) => void;
  onStartEditPost: (_post: NetworkingPostItem) => void;
  onCancelEdit: () => void;
};

function PostFormFields({
  title,
  summary,
  tags,
  roleNeeded,
  busy,
  submitLabel,
  onTitleChange,
  onSummaryChange,
  onTagsChange,
  onRoleNeededChange,
  onSubmit,
  onCancel,
}: {
  title: string;
  summary: string;
  tags: string;
  roleNeeded: string;
  busy: boolean;
  submitLabel: string;
  onTitleChange: (_value: string) => void;
  onSummaryChange: (_value: string) => void;
  onTagsChange: (_value: string) => void;
  onRoleNeededChange: (_value: string) => void;
  onSubmit: (_event: React.FormEvent) => void;
  onCancel?: () => void;
}) {
  const { t } = useTranslation();

  return (
    <form onSubmit={onSubmit} className="space-y-3 border-t border-brand-200/35 pt-4 dark:border-brand-800/30">
      <input
        className="vs-input"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder={t("networkingPostTitlePlaceholder")}
        dir="auto"
        maxLength={120}
        required
      />
      <textarea
        className="vs-textarea"
        value={summary}
        onChange={(e) => onSummaryChange(e.target.value)}
        placeholder={t("networkingPostSummaryPlaceholder")}
        dir="auto"
        rows={4}
        maxLength={360}
        required
      />
      <input
        className="vs-input"
        value={roleNeeded}
        onChange={(e) => onRoleNeededChange(e.target.value)}
        placeholder={t("networkingRolePlaceholder")}
        dir="auto"
        maxLength={80}
      />
      <input
        className="vs-input"
        value={tags}
        onChange={(e) => onTagsChange(e.target.value)}
        placeholder={t("networkingTagsPlaceholder")}
        dir="auto"
      />
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className="vs-btn-primary">
          {busy ? t("networkingPublishing") : submitLabel}
        </button>
        {onCancel ? (
          <button type="button" onClick={onCancel} className="vs-btn-outline px-4 py-2 text-sm">
            {t("cancel")}
          </button>
        ) : null}
      </div>
    </form>
  );
}

export default function NetworkingCollabBoard({
  posts,
  currentUserId,
  busy,
  title,
  summary,
  tags,
  roleNeeded,
  showCreateForm,
  editingPostId,
  onTitleChange,
  onSummaryChange,
  onTagsChange,
  onRoleNeededChange,
  onToggleCreateForm,
  onSubmitPost,
  onStartChat,
  onRequestClosePost,
  onToggleInterest,
  onStartEditPost,
  onCancelEdit,
}: NetworkingCollabBoardProps) {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === "rtl";

  return (
    <section className="vs-settings-card space-y-4" dir={rtl ? "rtl" : "ltr"}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <Megaphone className="vs-brand-icon-accent h-5 w-5 shrink-0" aria-hidden />
            {t("networkingCollabBoardTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted">{t("networkingCollabBoardHint")}</p>
        </div>
        <button
          type="button"
          onClick={onToggleCreateForm}
          disabled={Boolean(editingPostId)}
          className="vs-btn-primary-inline gap-2 disabled:opacity-60"
        >
          {showCreateForm ? t("cancel") : t("networkingCreatePostTitle")}
        </button>
      </div>

      {showCreateForm && !editingPostId ? (
        <PostFormFields
          title={title}
          summary={summary}
          tags={tags}
          roleNeeded={roleNeeded}
          busy={busy}
          submitLabel={t("networkingPublishPost")}
          onTitleChange={onTitleChange}
          onSummaryChange={onSummaryChange}
          onTagsChange={onTagsChange}
          onRoleNeededChange={onRoleNeededChange}
          onSubmit={onSubmitPost}
        />
      ) : null}

      {posts.length ? (
        <div className="grid gap-3">
          {posts.map((post) => {
            const postId = String(post._id || "");
            const authorId = String(post.author?._id || post.authorId || "");
            const authorLabel =
              networkingUserLabel(post.author) || t("networkingMemberFallback");
            const isOwn = Boolean(currentUserId && authorId && currentUserId === authorId);
            const roleLabel = String(post.roleNeeded || "").trim() || t("networkingAnyRole");
            const isEditing = editingPostId === postId;

            return (
              <article key={postId} className="vs-feed-card p-4">
                {isEditing ? (
                  <PostFormFields
                    title={title}
                    summary={summary}
                    tags={tags}
                    roleNeeded={roleNeeded}
                    busy={busy}
                    submitLabel={t("saveChanges")}
                    onTitleChange={onTitleChange}
                    onSummaryChange={onSummaryChange}
                    onTagsChange={onTagsChange}
                    onRoleNeededChange={onRoleNeededChange}
                    onSubmit={onSubmitPost}
                    onCancel={onCancelEdit}
                  />
                ) : (
                  <>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-ink" dir="auto">
                          {post.title}
                        </h3>
                        {authorId ? (
                          <Link
                            href={`/user/${encodeURIComponent(authorId)}`}
                            className="vs-brand-text-link mt-1 inline-block text-xs font-semibold"
                          >
                            {authorLabel}
                          </Link>
                        ) : (
                          <p className="mt-1 text-xs text-muted">{authorLabel}</p>
                        )}
                      </div>
                      <span className="vs-chip-current shrink-0 px-2.5 py-1 text-[11px]">
                        <Briefcase className="me-1 inline h-3 w-3" aria-hidden />
                        {roleLabel}
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-muted" dir="auto">
                      {post.summary}
                    </p>

                    {(post.tags || []).length ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {(post.tags || []).map((tag) => (
                          <span
                            key={`${postId}-${tag}`}
                            className="vs-chip-current px-2 py-0.5 text-[11px]"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    {post.interestedCount ? (
                      <p className="mt-2 text-xs font-semibold text-muted">
                        {t("networkingInterestedCount", { count: post.interestedCount })}
                      </p>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busy || !authorId || isOwn}
                        onClick={() => onStartChat(authorId)}
                        className="vs-btn-primary-inline"
                      >
                        {t("startChat")}
                      </button>
                      {!isOwn ? (
                        <button
                          type="button"
                          disabled={busy || !postId}
                          onClick={() => onToggleInterest(postId)}
                          className={cn(
                            "vs-btn-outline inline-flex px-4 py-2 text-sm",
                            post.viewerInterested && "border-brand-400 bg-brand-50/60 dark:bg-brand-900/30",
                          )}
                        >
                          {post.viewerInterested
                            ? t("networkingInterestedDone")
                            : t("networkingInterested")}
                        </button>
                      ) : null}
                      {isOwn ? (
                        <>
                          <button
                            type="button"
                            disabled={busy || !postId}
                            onClick={() => onStartEditPost(post)}
                            className="vs-btn-outline inline-flex items-center gap-2 px-4 py-2 text-sm"
                          >
                            <Pencil className="h-4 w-4" />
                            {t("networkingEditPost")}
                          </button>
                          <button
                            type="button"
                            disabled={busy || !postId}
                            onClick={() => onRequestClosePost(postId)}
                            className="vs-btn-outline inline-flex items-center gap-2 px-4 py-2 text-sm"
                          >
                            <X className="h-4 w-4" />
                            {t("networkingClosePost")}
                          </button>
                        </>
                      ) : null}
                    </div>
                  </>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="vs-brand-dashed-empty px-5 py-10 text-center text-sm">
          {t("networkingNoPosts")}
        </div>
      )}
    </section>
  );
}
