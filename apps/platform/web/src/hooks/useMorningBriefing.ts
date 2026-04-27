import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"

export interface MorningBriefing {
  enabled: boolean
  prompt: string | null
  last_shown: string | null
}

export function useMorningBriefing() {
  const { data, isLoading } = useQuery({
    queryKey: ["morning-briefing"],
    queryFn: () => api<MorningBriefing>("/api/settings/morning-briefing"),
  })
  return { briefing: data, isLoading }
}

interface UpdateInput {
  enabled?: boolean
  prompt?: string
  clear_prompt?: boolean
}

export function useUpdateMorningBriefing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: UpdateInput) =>
      api<MorningBriefing>("/api/settings/morning-briefing", {
        method: "PUT",
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => {
      qc.setQueryData(["morning-briefing"], data)
    },
  })
}
