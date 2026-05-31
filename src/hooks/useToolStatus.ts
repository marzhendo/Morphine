import { useQuery } from "@tanstack/react-query";
import { invoke } from "@tauri-apps/api/core";

type ToolStatusEntry = [string, boolean];

export function useToolStatus() {
  return useQuery({
    queryKey: ["tool-status"],
    queryFn:  () => invoke<ToolStatusEntry[]>("get_tool_status"),
    refetchInterval: 10_000,
  });
}

export function useIsLibreOfficeReady() {
  const { data } = useToolStatus();
  return data?.find(([name]) => name === "libreoffice")?.[1] ?? false;
}
