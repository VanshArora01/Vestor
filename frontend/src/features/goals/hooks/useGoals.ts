import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addGoalContribution,
  archiveGoal,
  createGoal,
  fetchGoal,
  fetchGoals,
  updateGoal,
} from "../../../api/goals";
import type {
  ContributionPayload,
  CreateGoalPayload,
  UpdateGoalPayload,
} from "../../../types/goals";

export function useGoals(includeArchived = false) {
  return useQuery({
    queryKey: ["goals", includeArchived],
    queryFn: () => fetchGoals(includeArchived),
  });
}

export function useGoal(goalId: string | null) {
  return useQuery({
    queryKey: ["goal", goalId],
    queryFn: () => fetchGoal(goalId!),
    enabled: Boolean(goalId),
  });
}

export function useGoalMutations() {
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["goals"] });
    await queryClient.invalidateQueries({ queryKey: ["goal"] });
    await queryClient.invalidateQueries({ queryKey: ["money"] });
  };

  const create = useMutation({
    mutationFn: (payload: CreateGoalPayload) => createGoal(payload),
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: ({ goalId, payload }: { goalId: string; payload: UpdateGoalPayload }) =>
      updateGoal(goalId, payload),
    onSuccess: invalidate,
  });

  const contribute = useMutation({
    mutationFn: ({ goalId, payload }: { goalId: string; payload: ContributionPayload }) =>
      addGoalContribution(goalId, payload),
    onSuccess: invalidate,
  });

  const archive = useMutation({
    mutationFn: (goalId: string) => archiveGoal(goalId),
    onSuccess: invalidate,
  });

  return { create, update, contribute, archive };
}
