import { useState, useEffect, useCallback } from "react";
import type { LessonId, StageId, OverallLearnState, LessonProgress } from "../types";
import { academyApi } from "../../../api/academy";

const STORAGE_KEY = "vestor_learn_progress_v1";

function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

const DEFAULT_STATE: OverallLearnState = {
  completedLessons: [],
  lessonProgress: {},
  streakDays: 1,
  lastActiveDate: getTodayString(),
  totalXp: 0,
};

function normalizeProgress(value: unknown): OverallLearnState {
  if (!value || typeof value !== "object") return DEFAULT_STATE;
  const parsed = value as Partial<OverallLearnState>;
  return {
    completedLessons: Array.isArray(parsed.completedLessons)
      ? parsed.completedLessons.filter((id): id is string => typeof id === "string")
      : [],
    lessonProgress: parsed.lessonProgress && typeof parsed.lessonProgress === "object"
      ? parsed.lessonProgress
      : {},
    streakDays: Number.isFinite(parsed.streakDays) ? Math.max(0, Number(parsed.streakDays)) : 0,
    lastActiveDate: typeof parsed.lastActiveDate === "string" ? parsed.lastActiveDate : getTodayString(),
    totalXp: Number.isFinite(parsed.totalXp) ? Math.max(0, Number(parsed.totalXp)) : 0,
  };
}

export function useLearnProgress() {
  const [state, setState] = useState<OverallLearnState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return normalizeProgress(JSON.parse(stored));
      }
    } catch {
      // Ignore JSON parse errors
    }
    return DEFAULT_STATE;
  });

  // Keep state synced with localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Storage quota or privacy restriction
    }
  }, [state]);

  useEffect(() => {
    let active = true;
    void academyApi.getProgress().then((remote) => {
      if (!active) return;
      setState((prev) => {
        const remoteProgress: OverallLearnState["lessonProgress"] = {};
        const rows = remote.lesson_progress && typeof remote.lesson_progress === "object" ? remote.lesson_progress : {};
        for (const [id, item] of Object.entries(rows)) {
          const stage = typeof item.current_stage === "string" ? item.current_stage : "hook";
          const stepIndex = stage.startsWith("step:") ? Number(stage.slice(5)) : undefined;
          remoteProgress[id] = {
            stage: "hook",
            isCompleted: item.is_completed,
            quizScore: item.quiz_score,
            predictionAnswer: item.prediction_answer,
            quizAnswers: item.quiz_answers,
            completedAt: item.completed_at,
            stepIndex: Number.isFinite(stepIndex) ? stepIndex : undefined,
          };
        }
        return {
          ...prev,
          completedLessons: [...new Set([
            ...prev.completedLessons,
            ...(Array.isArray(remote.completed_lessons) ? remote.completed_lessons.filter((id) => typeof id === "string") : []),
          ])],
          lessonProgress: { ...remoteProgress, ...prev.lessonProgress },
          totalXp: Math.max(prev.totalXp, remote.total_xp),
          streakDays: Math.max(prev.streakDays, remote.streak_days),
          lastActiveDate: remote.last_active_date || prev.lastActiveDate,
        };
      });
    }).catch(() => { /* Local progress remains available offline. */ });
    return () => { active = false; };
  }, []);

  const updateActivityStreak = useCallback(() => {
    const today = getTodayString();
    setState((prev) => {
      if (prev.lastActiveDate === today) {
        return prev;
      }
      const lastDate = new Date(prev.lastActiveDate);
      const currentDate = new Date(today);
      const diffDays = Math.round((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      let newStreak = prev.streakDays;
      if (diffDays === 1) {
        newStreak += 1;
      } else if (diffDays > 1) {
        newStreak = 1;
      }

      return {
        ...prev,
        lastActiveDate: today,
        streakDays: newStreak,
      };
    });
  }, []);

  const getLessonProgress = useCallback(
    (lessonId: LessonId): LessonProgress => {
      return (
        state.lessonProgress[lessonId] || {
          stage: "hook",
          isCompleted: state.completedLessons.includes(lessonId),
        }
      );
    },
    [state.lessonProgress, state.completedLessons],
  );

  const setStage = useCallback((lessonId: LessonId, stage: StageId) => {
    setState((prev) => {
      const current = prev.lessonProgress[lessonId] || {
        stage: "hook",
        isCompleted: prev.completedLessons.includes(lessonId),
      };
      return {
        ...prev,
        lessonProgress: {
          ...prev.lessonProgress,
          [lessonId]: {
            ...current,
            stage,
          },
        },
      };
    });
  }, []);

  const setLessonStep = useCallback((lessonId: string, stepIndex: number) => {
    setState((prev) => ({
      ...prev,
      lessonProgress: {
        ...prev.lessonProgress,
        [lessonId]: {
          ...(prev.lessonProgress[lessonId] ?? { stage: "hook", isCompleted: false }),
          stepIndex,
        },
      },
    }));
    void academyApi.updateProgress(lessonId, { current_stage: `step:${stepIndex}` }).catch(() => {});
  }, []);

  const recordPrediction = useCallback(
    (lessonId: LessonId, answerId: string) => {
      updateActivityStreak();
      setState((prev) => {
        const current = prev.lessonProgress[lessonId] || {
          stage: "predict",
          isCompleted: prev.completedLessons.includes(lessonId),
        };
        return {
          ...prev,
          lessonProgress: {
            ...prev.lessonProgress,
            [lessonId]: {
              ...current,
              predictionAnswer: answerId,
            },
          },
        };
      });
    },
    [updateActivityStreak],
  );

  const recordQuizAnswer = useCallback(
    (lessonId: LessonId, questionId: string, optionId: string) => {
      updateActivityStreak();
      setState((prev) => {
        const current = prev.lessonProgress[lessonId] || {
          stage: "check",
          isCompleted: prev.completedLessons.includes(lessonId),
        };
        const currentAnswers = current.quizAnswers || {};
        return {
          ...prev,
          lessonProgress: {
            ...prev.lessonProgress,
            [lessonId]: {
              ...current,
              quizAnswers: {
                ...currentAnswers,
                [questionId]: optionId,
              },
            },
          },
        };
      });
    },
    [updateActivityStreak],
  );

  const completeLesson = useCallback(
    (lessonId: LessonId, quizScorePct: number = 100) => {
      updateActivityStreak();
      setState((prev) => {
        const alreadyCompleted = prev.completedLessons.includes(lessonId);
        const newCompleted = alreadyCompleted
          ? prev.completedLessons
          : [...prev.completedLessons, lessonId];

        // XP Calculation: 50 base XP + up to 30 quiz accuracy bonus
        const earnedXp = alreadyCompleted ? 0 : 50 + Math.round((quizScorePct / 100) * 30);

        const current = prev.lessonProgress[lessonId] || {
          stage: "act",
          isCompleted: true,
        };

        return {
          ...prev,
          completedLessons: newCompleted,
          totalXp: prev.totalXp + earnedXp,
          lessonProgress: {
            ...prev.lessonProgress,
            [lessonId]: {
              ...current,
              stage: "act",
              isCompleted: true,
              quizScore: quizScorePct,
              completedAt: new Date().toISOString(),
            },
          },
        };
      });
      void academyApi.updateProgress(lessonId, {
        is_completed: true,
        quiz_score: quizScorePct,
        current_stage: "complete",
      }).catch(() => {});
    },
    [updateActivityStreak],
  );

  return {
    state,
    getLessonProgress,
    setStage,
    setLessonStep,
    recordPrediction,
    recordQuizAnswer,
    completeLesson,
    updateActivityStreak,
  };
}
