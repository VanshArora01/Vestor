import { apiClient } from "./client";
import type {
  ContributionPayload,
  CreateGoalPayload,
  Goal,
  GoalDetail,
  GoalsListResponse,
  GoalsSummary,
  UpdateGoalPayload,
} from "../types/goals";

export interface GoalProjection {
  goal_id: string;
  metrics: Goal["metrics"];
  message: string;
}

export async function fetchGoals(includeArchived = false): Promise<GoalsListResponse> {
  const { data } = await apiClient.get<GoalsListResponse>("/goals", {
    params: { include_archived: includeArchived },
  });
  return data;
}

export async function fetchGoalsSummary(): Promise<GoalsSummary> {
  const { data } = await apiClient.get<GoalsSummary>("/goals/summary");
  return data;
}

export async function fetchGoal(goalId: string): Promise<GoalDetail> {
  const { data } = await apiClient.get<GoalDetail>(`/goals/${goalId}`);
  return data;
}

export async function createGoal(payload: CreateGoalPayload): Promise<Goal> {
  const { data } = await apiClient.post<Goal>("/goals", payload);
  return data;
}

export async function updateGoal(goalId: string, payload: UpdateGoalPayload): Promise<Goal> {
  const { data } = await apiClient.patch<Goal>(`/goals/${goalId}`, payload);
  return data;
}

export async function addGoalContribution(
  goalId: string,
  payload: ContributionPayload,
): Promise<GoalDetail> {
  const { data } = await apiClient.post<GoalDetail>(`/goals/${goalId}/contributions`, payload);
  return data;
}

export async function fetchGoalProjection(goalId: string): Promise<GoalProjection> {
  const { data } = await apiClient.get<GoalProjection>(`/goals/${goalId}/projection`);
  return data;
}

export async function archiveGoal(goalId: string): Promise<Goal> {
  const { data } = await apiClient.post<Goal>(`/goals/${goalId}/archive`);
  return data;
}
