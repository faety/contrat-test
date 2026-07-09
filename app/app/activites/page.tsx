"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { demoChallenges, demoCourses, demoUser } from "@/lib/demo-data";
import { Badge, Button, Card } from "@/components/ui";

type Tab = "challenges" | "courses";

export default function ActivitiesPage() {
  const { t, locale } = useI18n();
  const [tab, setTab] = useState<Tab>("challenges");
  const [joined, setJoined] = useState<Record<string, boolean>>(
    Object.fromEntries(demoChallenges.map((challenge) => [challenge.id, challenge.joined])),
  );

  const xpPercent = Math.round((demoUser.xp / demoUser.xpNextLevel) * 100);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black tracking-tight">{t("activities.title")}</h1>

      {/* Progression XP */}
      <Card>
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold">
            ⭐ {t("home.level")} · {locale === "fr" ? demoUser.levelFr : demoUser.levelEn}
          </p>
          <p className="text-xs text-ink-500 dark:text-ink-400">
            {demoUser.xp}/{demoUser.xpNextLevel} {t("activities.xp")}
          </p>
        </div>
        <div
          role="progressbar"
          aria-valuenow={demoUser.xp}
          aria-valuemin={0}
          aria-valuemax={demoUser.xpNextLevel}
          className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
            style={{ width: `${xpPercent}%` }}
          />
        </div>
      </Card>

      {/* Onglets */}
      <div className="grid grid-cols-2 gap-2 rounded-full bg-ink-100 p-1 dark:bg-ink-800" role="tablist">
        {(
          [
            { id: "challenges", label: `🏆 ${t("activities.challenges")}` },
            { id: "courses", label: `🎓 ${t("activities.courses")}` },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`min-h-11 rounded-full text-sm font-semibold transition-colors ${
              tab === item.id
                ? "bg-white text-ink-900 shadow-sm dark:bg-ink-600 dark:text-white"
                : "text-ink-500 dark:text-ink-400"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "challenges" ? (
        <div className="space-y-4">
          {demoChallenges.map((challenge) => {
            const isJoined = joined[challenge.id] ?? false;
            const percent = Math.round((challenge.progress / challenge.target) * 100);
            return (
              <Card key={challenge.id} className="space-y-3">
                <div className="flex items-start gap-3">
                  <span
                    className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-ink-100 text-2xl dark:bg-ink-800"
                    aria-hidden
                  >
                    {challenge.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-bold">
                      {locale === "fr" ? challenge.nameFr : challenge.nameEn}
                    </h2>
                    <p className="mt-0.5 text-sm text-ink-600 dark:text-ink-300">
                      {locale === "fr" ? challenge.descFr : challenge.descEn}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <Badge>
                    🎁 {t("activities.reward")} : {challenge.reward} ʙ
                  </Badge>
                  {challenge.bonus ? (
                    <Badge tone="amber">
                      ✨ {t("activities.bonus")} : +{challenge.bonus} ʙ
                    </Badge>
                  ) : null}
                </div>
                {isJoined ? (
                  <div>
                    <div className="flex justify-between text-xs text-ink-500 dark:text-ink-400">
                      <span>
                        {t("activities.progress")} : {challenge.progress}/{challenge.target}
                      </span>
                      <span>{percent} %</span>
                    </div>
                    <div
                      role="progressbar"
                      aria-valuenow={challenge.progress}
                      aria-valuemin={0}
                      aria-valuemax={challenge.target}
                      className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800"
                    >
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => setJoined((prev) => ({ ...prev, [challenge.id]: true }))}
                  >
                    {t("activities.join")}
                  </Button>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          {demoCourses.map((course) => (
            <Card key={course.id} className="space-y-3">
              <div className="flex items-start gap-3">
                <span
                  className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-ink-100 text-2xl dark:bg-ink-800"
                  aria-hidden
                >
                  {course.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold">
                    {locale === "fr" ? course.titleFr : course.titleEn}
                  </h2>
                  <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">
                    {t(
                      course.level === "beginner"
                        ? "activities.level.beginner"
                        : "activities.level.intermediate",
                    )}{" "}
                    · {course.lessons} {t("activities.lessons")} · {t("activities.duration")}{" "}
                    {locale === "fr" ? course.durationFr : course.durationEn}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge>🎁 +{course.reward} ʙ</Badge>
                {course.certificate ? (
                  <Badge tone="green">📜 {t("activities.certificate")}</Badge>
                ) : null}
              </div>
              {course.progress === 100 ? (
                <p className="rounded-2xl bg-emerald-50 px-4 py-2.5 text-center text-sm font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                  ✅ {t("activities.completed")}
                </p>
              ) : course.progress > 0 ? (
                <>
                  <div
                    role="progressbar"
                    aria-valuenow={course.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="h-2 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800"
                  >
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                  <Button variant="secondary" className="w-full">
                    {t("activities.continue")} ({course.progress} %)
                  </Button>
                </>
              ) : (
                <Button variant="secondary" className="w-full">
                  {t("activities.start")}
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
