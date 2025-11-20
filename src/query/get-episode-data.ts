import { GET_EPISODE_DATA } from "@/constants/query-keys";
import { api } from "@/lib/api";
import { IEpisodeSource } from "@/types/episodes";
import { useQuery } from "react-query";

const getEpisodeData = async (
  episodeId: string,
  server: string | undefined,
  subOrDub: string,
) => {
  if (!server) return; // Do not fetch if server is not selected
  const res = await api.get("/api/episode/sources", {
    params: {
      animeEpisodeId: decodeURIComponent(episodeId),
      server: server,
      category: subOrDub,
    },
  });
  return res.data.data as IEpisodeSource;
};

export const useGetEpisodeData = (
  episodeId: string,
  server: string | undefined,
  subOrDub: string = "sub",
  enabled: boolean = true, // Control when the query should run
) => {
  return useQuery({
    queryFn: () => getEpisodeData(episodeId, server, subOrDub),
    queryKey: [GET_EPISODE_DATA, episodeId, server, subOrDub],
    refetchOnWindowFocus: false,
    enabled: enabled && !!server, // Query is enabled only if `enabled` is true and `server` is provided
  });
};
