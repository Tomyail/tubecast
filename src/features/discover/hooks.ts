import { useQuery } from "@tanstack/react-query";
import { fetchDiscover } from "./api";

// 内存级缓存，5 分钟 staleTime，不持久化（决策 7）。
export function useDiscover() {
  return useQuery({
    queryKey: ["discover"],
    queryFn: fetchDiscover,
    staleTime: 5 * 60 * 1000,
  });
}
