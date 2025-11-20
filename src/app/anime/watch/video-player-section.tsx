"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAnimeStore } from "@/store/anime-store";
import { IWatchedAnime } from "@/types/watched-anime";
import KitsunePlayer from "@/components/kitsune-player";
import { useGetEpisodeData } from "@/query/get-episode-data";
import { useGetEpisodeServers } from "@/query/get-episode-servers";
import { AlertCircleIcon, Captions, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuthStore } from "@/store/auth-store";
import { pb } from "@/lib/pocketbase";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { GET_EPISODE_DATA } from "@/constants/query-keys";
import { useQueryClient } from "@tanstack/react-query";

interface IServer {
  serverName: string;
  serverType: "sub" | "dub";
}

const VideoPlayerSection = () => {
  const { selectedEpisode, anime } = useAnimeStore();
  const { data: serversData } = useGetEpisodeServers(selectedEpisode);
  const queryClient = useQueryClient();

  const [activeServer, setActiveServer] = useState<IServer | null>(null);
  const [availableServers, setAvailableServers] = useState<IServer[]>([]);
  const [serversSearched, setServersSearched] = useState(false);

  const { auth, setAuth } = useAuthStore();
  const [autoSkip, setAutoSkip] = useState<boolean>(
    auth?.autoSkip || Boolean(localStorage.getItem("autoSkip")) || false
  );

  // Effect to reset state when a new episode is selected
  useEffect(() => {
    setActiveServer(null);
    setAvailableServers([]);
    setServersSearched(false);
    // Invalidate any cached data for the old episode
    queryClient.invalidateQueries({ queryKey: [GET_EPISODE_DATA] });
  }, [selectedEpisode, queryClient]);

  const {
    data: episodeData,
    isLoading: isEpisodeDataLoading,
    refetch,
  } = useGetEpisodeData(
    selectedEpisode,
    activeServer?.serverName || "",
    activeServer?.serverType || "",
    !!activeServer
  );

  const findWorkingServers = useCallback(async () => {
    if (!serversData || serversSearched) return;

    setServersSearched(true);
    const workingServers: IServer[] = [];

    const checkServer = async (server: any, type: "sub" | "dub") => {
      try {
        const { data: newData, isSuccess } = await refetch({
          queryKey: [
            GET_EPISODE_DATA,
            selectedEpisode,
            server.serverName,
            type,
          ],
        });
        if (isSuccess && newData && newData.sources.length > 0) {
          workingServers.push({ serverName: server.serverName, serverType: type });
        }
      } catch (error) {
        console.error(`Server ${server.serverName} (${type}) failed:`, error);
      }
    };

    const subServers = serversData.sub || [];
    const dubServers = serversData.dub || [];

    await Promise.all([
        ...subServers.map(s => checkServer(s, "sub")),
        ...dubServers.map(s => checkServer(s, "dub"))
    ]);

    setAvailableServers(workingServers);
    if (workingServers.length > 0) {
      setActiveServer(workingServers[0]);
    }
  }, [serversData, selectedEpisode, refetch, serversSearched]);

  useEffect(() => {
    findWorkingServers();
  }, [findWorkingServers]);

  const [watchedDetails, setWatchedDetails] = useState<Array<IWatchedAnime>>(
    JSON.parse(localStorage.getItem("watched") as string) || []
  );

  function changeServer(server: IServer) {
    setActiveServer(server);
    localStorage.setItem("serverPreference", JSON.stringify(server));
  }

  async function onHandleAutoSkipChange(value: boolean) {
    setAutoSkip(value);
    if (!auth) {
      localStorage.setItem("autoSkip", JSON.stringify(value));
      return;
    }
    const res = await pb
      .collection("users")
      .update(auth.id, { autoSkip: value });
    if (res) {
      setAuth({ ...auth, autoSkip: value });
    }
  }

  useEffect(() => {
    if (auth || !episodeData) return;
    if (!Array.isArray(watchedDetails)) {
      localStorage.removeItem("watched");
      return;
    }

    const existingAnime = watchedDetails.find(
      (watchedAnime) => watchedAnime.anime.id === anime.anime.info.id
    );

    if (!existingAnime) {
      const updatedWatchedDetails = [
        ...watchedDetails,
        {
          anime: {
            id: anime.anime.info.id,
            title: anime.anime.info.name,
            poster: anime.anime.info.poster,
          },
          episodes: [selectedEpisode],
        },
      ];
      localStorage.setItem("watched", JSON.stringify(updatedWatchedDetails));
      setWatchedDetails(updatedWatchedDetails);
    } else {
      const episodeAlreadyWatched =
        existingAnime.episodes.includes(selectedEpisode);

      if (!episodeAlreadyWatched) {
        const updatedWatchedDetails = watchedDetails.map((watchedAnime) =>
          watchedAnime.anime.id === anime.anime.info.id
            ? {
                ...watchedAnime,
                episodes: [...watchedAnime.episodes, selectedEpisode],
              }
            : watchedAnime
        );
        localStorage.setItem("watched", JSON.stringify(updatedWatchedDetails));
        setWatchedDetails(updatedWatchedDetails);
      }
    }
    //eslint-disable-next-line
  }, [episodeData, selectedEpisode, auth]);
  
  const isLoading = isEpisodeDataLoading || (!serversSearched && !availableServers.length);
  
  if (isLoading) {
    return (
      <div className="h-auto aspect-video lg:max-h-[calc(100vh-150px)] min-h-[20vh] sm:min-h-[30vh] md:min-h-[40vh] lg:min-h-[60vh] w-full animate-pulse bg-slate-700 rounded-md"></div>
    );
  }
  
  if (!activeServer || !episodeData || episodeData?.sources.length === 0) {
     return (
    <>
      <div
        className={
          "relative w-full h-auto aspect-video  min-h-[20vh] sm:min-h-[30vh] md:min-h-[40vh] lg:min-h-[60vh] max-h-[500px] lg:max-h-[calc(100vh-150px)] bg-black overflow-hidden p-4"
        }
      >
        <iframe
          src={`https://megaplay.buzz/stream/s-2/${
            serversData?.episodeId.split("?ep=")[1]
          }/sub`}
          width="100%"
          height="100%"
          allowFullScreen
        ></iframe>
      </div>
      <div className="mt-4">
        <Alert variant="destructive" className="text-red-400">
          <AlertTitle className="font-bold flex items-center space-x-2">
            <AlertCircleIcon size="20" />
            <p>Fallback Video Player Activated</p>
          </AlertTitle>
          <AlertDescription>
            The original video source for this episode is currently unavailable.
            A fallback player has been provided for your convenience. We
            recommend using an ad blocker for a smoother viewing experience.
          </AlertDescription>
        </Alert>
      </div>
    </>
     )
  }

  return (
    <div>
      <KitsunePlayer
        key={episodeData?.sources?.[0].url}
        episodeInfo={episodeData!}
        serversData={serversData!}
        animeInfo={{
          id: anime.anime.info.id,
          title: anime.anime.info.name,
          image: anime.anime.info.poster,
        }}
        subOrDub={activeServer.serverType}
        autoSkip={autoSkip}
      />
      <div className="flex flex-row bg-[#0f172a]  items-start justify-between w-full p-5">
        <div>
         {availableServers.filter(s => s.serverType === 'sub').length > 0 && (
          <div className="flex flex-row items-center space-x-5">
            <Captions className="text-red-300" />
            <p className="font-bold text-sm">SUB</p>
            {availableServers.filter(s => s.serverType === 'sub').map((s, i) => (
              <Button
                size="sm"
                key={i}
                className={`uppercase font-bold ${
                  activeServer.serverName === s.serverName && activeServer.serverType === "sub" && "bg-red-300"
                }`}
                onClick={() => changeServer(s)}
              >
                {s.serverName}
              </Button>
            ))}
          </div>
         )}
         {availableServers.filter(s => s.serverType === 'dub').length > 0 && (
            <div className="flex flex-row items-center space-x-5 mt-2">
              <Mic className="text-green-300" />
              <p className="font-bold text-sm">DUB</p>
              {availableServers.filter(s => s.serverType === 'dub').map((s, i) => (
                <Button
                  size="sm"
                  key={i}
                  className={`uppercase font-bold ${
                    activeServer.serverName === s.serverName && activeServer.serverType === "dub" && "bg-green-300"
                  }`}
                  onClick={() => changeServer(s)}
                >
                  {s.serverName}
                </Button>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-row items-center space-x-2 text-sm">
          <Switch
            checked={autoSkip}
            onCheckedChange={(e) => onHandleAutoSkipChange(e)}
            id="auto-skip"
          />
          <p>Auto Skip</p>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayerSection;
