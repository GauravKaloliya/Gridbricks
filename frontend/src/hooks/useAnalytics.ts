import { useQuery } from "@tanstack/react-query";

import {
  fetchAccuracy,
  fetchActuals,
  fetchMeta,
  fetchRevisions,
} from "../services/api";

export function useAccuracy(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["accuracy", startDate, endDate],
    queryFn: () => fetchAccuracy(startDate, endDate),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

export function useActuals(
  startDate: string,
  endDate: string,
  enabled = true,
) {
  return useQuery({
    queryKey: ["actuals", startDate, endDate],
    queryFn: () => fetchActuals(startDate, endDate),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
    enabled,
  });
}

export function useMeta() {
  return useQuery({
    queryKey: ["meta"],
    queryFn: fetchMeta,
    staleTime: 60 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}

export function useRevisions(startTime: string | null) {
  return useQuery({
    queryKey: ["revisions", startTime],
    queryFn: () => fetchRevisions(startTime as string),
    enabled: Boolean(startTime),
    staleTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });
}
