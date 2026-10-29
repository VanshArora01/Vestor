import axios from "axios";
import { tokenStorage } from "../utils/tokenStorage";

const apiClient = axios.create({
  baseURL: "/api/v1/academy",
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface LessonProgressPayload {
  current_stage?: string;
  is_completed?: boolean;
  quiz_score?: number;
  prediction_answer?: string;
  quiz_answers?: Record<string, string>;
}

export interface UserProgressDto {
  completed_lessons: string[];
  lesson_progress: Record<
    string,
    {
      lesson_id: string;
      current_stage: string;
      is_completed: boolean;
      quiz_score?: number;
      prediction_answer?: string;
      quiz_answers?: Record<string, string>;
      completed_at?: string;
    }
  >;
  streak_days: number;
  total_xp: number;
  last_active_date: string;
}

export interface RecommendationDto {
  recommended_lesson_id: string;
  reason: string;
  path_title: string;
  tier: number;
}

export const academyApi = {
  async getProgress(): Promise<UserProgressDto> {
    const { data } = await apiClient.get<UserProgressDto>("/progress");
    return data;
  },

  async updateProgress(lessonId: string, payload: LessonProgressPayload): Promise<UserProgressDto> {
    const { data } = await apiClient.put<UserProgressDto>(`/progress/${lessonId}`, payload);
    return data;
  },

  async getRecommendation(): Promise<RecommendationDto> {
    const { data } = await apiClient.get<RecommendationDto>("/recommendation");
    return data;
  },
};
