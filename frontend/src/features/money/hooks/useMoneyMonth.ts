import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addRemainingToOthers,
  createCategory,
  deactivateCategory,
  getComparison,
  getMonth,
  listCategories,
  listMonths,
  setAllocation,
  setIncome,
  setSpending,
  unlockMonth,
  updateCategory,
  getMoneyReconciliation,
  setAdjustment,
} from "../../../api/money";
import { updateTransactionClassification } from "../../../api/banking";
import type {
  AllocationSemanticType,
  CategoryKind,
  MoneyCategory,
} from "../../../types/money";

export function moneyQueryKey(year: number, month: number) {
  return ["money", year, month] as const;
}

async function fetchMoneyMonth(year: number, month: number) {
  const [state, history, allocCats, spendCats, comp, reconciliation] = await Promise.all([
    getMonth(year, month),
    listMonths(),
    listCategories("allocation"),
    listCategories("spending"),
    getComparison(year, month).catch(() => null),
    getMoneyReconciliation(year, month).catch(() => null),
  ]);
  return { state, history, allocCats, spendCats, comp, reconciliation };
}

export function useMoneyMonth(year: number, month: number) {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: moneyQueryKey(year, month),
    queryFn: () => fetchMoneyMonth(year, month),
  });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["money"] }),
      queryClient.invalidateQueries({ queryKey: ["goals"] }),
      queryClient.invalidateQueries({ queryKey: ["goal"] }),
    ]);
  };

  const saveIncomeMutation = useMutation({
    mutationFn: (amount: string) => setIncome(year, month, amount),
    onSuccess: invalidate,
  });

  const saveAllocationMutation = useMutation({
    mutationFn: ({
      items,
      requireComplete,
    }: {
      items: Array<{ category_id?: string; goal_id?: string; amount: string }>;
      requireComplete?: boolean;
    }) => setAllocation(year, month, items, requireComplete ?? false),
    onSuccess: invalidate,
  });

  const saveRemainingMutation = useMutation({
    mutationFn: () => addRemainingToOthers(year, month),
    onSuccess: invalidate,
  });

  const saveSpendingMutation = useMutation({
    mutationFn: (items: Array<{ category_id: string; amount: string }>) =>
      setSpending(year, month, items),
    onSuccess: invalidate,
  });

  const unlockMutation = useMutation({
    mutationFn: () => unlockMonth(year, month),
    onSuccess: invalidate,
  });

  const createCategoryMutation = useMutation({
    mutationFn: (payload: {
      kind: CategoryKind;
      name: string;
      semantic_type?: AllocationSemanticType;
    }) => createCategory(payload),
    onSuccess: invalidate,
  });

  const updateCategoryMutation = useMutation({
    mutationFn: ({
      categoryId,
      kind,
      payload,
    }: {
      categoryId: string;
      kind: CategoryKind;
      payload: { name?: string; semantic_type?: AllocationSemanticType; is_active?: boolean };
    }) => updateCategory(categoryId, kind, payload),
    onSuccess: invalidate,
  });

  const deactivateCategoryMutation = useMutation({
    mutationFn: ({ categoryId, kind }: { categoryId: string; kind: CategoryKind }) =>
      deactivateCategory(categoryId, kind),
    onSuccess: invalidate,
  });

  const saveAdjustmentMutation = useMutation({
    mutationFn: (amount: string) => setAdjustment(year, month, amount),
    onSuccess: invalidate,
  });

  const confirmCandidateMutation = useMutation({
    mutationFn: ({ txId, isSalary }: { txId: string; isSalary: boolean }) =>
      updateTransactionClassification(txId, "INCOME", isSalary ? "Salary" : "Other income"),
    onSuccess: async () => {
      await Promise.all([invalidate(), queryClient.invalidateQueries({ queryKey: ["all-transactions"] })]);
    },
  });

  return {
    monthState: data?.state ?? null,
    comparison: data?.comp ?? null,
    months: data?.history ?? [],
    allocationCategories: (data?.allocCats ?? []) as MoneyCategory[],
    spendingCategories: (data?.spendCats ?? []) as MoneyCategory[],
    reconciliation: data?.reconciliation ?? null,
    isLoading,
    error: error instanceof Error ? error.message : error ? "Failed to load money data" : null,
    reload: refetch,
    saveIncome: (amount: string) => saveIncomeMutation.mutateAsync(amount),
    saveAdjustment: (amount: string) => saveAdjustmentMutation.mutateAsync(amount),
    confirmCandidate: (txId: string, isSalary: boolean) => confirmCandidateMutation.mutateAsync({ txId, isSalary }),
    saveAllocation: (
      items: Array<{ category_id?: string; goal_id?: string; amount: string }>,
      requireComplete = false,
    ) => saveAllocationMutation.mutateAsync({ items, requireComplete }),
    saveRemainingToOthers: () => saveRemainingMutation.mutateAsync(),
    saveSpending: (items: Array<{ category_id: string; amount: string }>) =>
      saveSpendingMutation.mutateAsync(items),
    unlock: () => unlockMutation.mutateAsync(),
    createCategory: (payload: {
      kind: CategoryKind;
      name: string;
      semantic_type?: AllocationSemanticType;
    }) => createCategoryMutation.mutateAsync(payload),
    renameCategory: (
      categoryId: string,
      kind: CategoryKind,
      name: string,
      semantic_type?: AllocationSemanticType,
    ) =>
      updateCategoryMutation.mutateAsync({
        categoryId,
        kind,
        payload: { name, ...(semantic_type ? { semantic_type } : {}) },
      }),
    hideCategory: (categoryId: string, kind: CategoryKind) =>
      deactivateCategoryMutation.mutateAsync({ categoryId, kind }),
  };
}
