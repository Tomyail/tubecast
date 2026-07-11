import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchDiscover } from "./api";
import { getCachedDiscover, saveCachedDiscover } from "./cache";
import { screenshotDemoMode } from "../demoMode/config";
import { getDemoDiscover } from "../demoMode/data";

const DISCOVER_QUERY_KEY = ["discover"] as const;

// 内存缓存 5 分钟；冷启动用 AsyncStorage 恢复 24 小时内的上次首页数据。
export function useDiscover() {
  if (screenshotDemoMode) {
    const data = getDemoDiscover();
    return {
      data,
      isLoading: false,
      isError: false,
      isRefetching: false,
      isRestoring: false,
      refetch: async () => ({ data }),
    };
  }

  const queryClient = useQueryClient();
  const [isRestoring, setIsRestoring] = useState(() => queryClient.getQueryData(DISCOVER_QUERY_KEY) === undefined);

  useEffect(() => {
    if (!isRestoring) return;
    let cancelled = false;

    getCachedDiscover()
      .then((cached) => {
        if (cancelled) return;
        if (cached && queryClient.getQueryData(DISCOVER_QUERY_KEY) === undefined) {
          queryClient.setQueryData(DISCOVER_QUERY_KEY, cached.data, { updatedAt: cached.savedAtMs });
        }
      })
      .finally(() => {
        if (!cancelled) setIsRestoring(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isRestoring, queryClient]);

  const query = useQuery({
    queryKey: DISCOVER_QUERY_KEY,
    queryFn: async () => {
      const data = await fetchDiscover();
      void saveCachedDiscover(data).catch((error) => {
        console.warn("Failed to persist discover cache", error);
      });
      return data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !isRestoring,
  });

  return { ...query, isRestoring };
}
