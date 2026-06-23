"use client";

export default function PollComposer({
  question,
  setQuestion,
  options,
  setOptions,
  allowsMultiple,
  setAllowsMultiple,
  closesAt,
  setClosesAt,
  onCancel,
  onSend,
  t,
}) {
  return (
    <div className="vs-composer-surface mb-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-ink">
            {t("pollCreateTitle")}
          </div>
          <div className="text-xs text-muted">{t("pollCreateHint")}</div>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="vs-btn-outline-sm rounded-full"
        >
          {t("cancel")}
        </button>
      </div>
      <div className="grid gap-2">
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={t("pollQuestionPlaceholder")}
          className="vs-input !h-auto py-3"
        />
        {options.map((option, index) => (
          <input
            key={`poll-option-${index}`}
            value={option}
            onChange={(e) =>
              setOptions((items) =>
                items.map((row, rowIndex) =>
                  rowIndex === index ? e.target.value : row,
                ),
              )
            }
            placeholder={t("pollOptionPlaceholder", { index: index + 1 })}
            className="vs-input !h-auto py-3"
          />
        ))}
        {options.length < 6 ? (
          <button
            type="button"
            onClick={() => setOptions((items) => [...items, ""])}
            className="vs-btn-outline-sm justify-self-start rounded-full text-ink"
          >
            {t("pollAddOption")}
          </button>
        ) : null}
        <div className="grid gap-2 md:grid-cols-2">
          <label className="vs-choice-row flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              className="accent-brand-600"
              checked={allowsMultiple}
              onChange={(e) => setAllowsMultiple(e.target.checked)}
            />
            <span>{t("pollAllowMultiple")}</span>
          </label>
          <label className="vs-choice-row grid cursor-pointer gap-1">
            <span className="text-xs text-muted">{t("pollCloseAt")}</span>
            <input
              type="datetime-local"
              value={closesAt}
              min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
              onChange={(e) => setClosesAt(e.target.value)}
              className="bg-transparent text-sm text-ink outline-none dark:text-ink"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={onSend}
          className="vs-btn-primary-inline justify-self-start"
        >
          {t("pollSend")}
        </button>
      </div>
    </div>
  );
}
