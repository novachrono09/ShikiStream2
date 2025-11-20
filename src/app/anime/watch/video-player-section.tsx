"use client";

import React, { useEffect, useState } from "react";
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

const VideoPlayerSection = () => {
  const { selectedEpisode, anime } = useAnimeStore();
  const { data: serversData } = useGetEpisodeServers(selectedEpisode);

  const [serverName, setServerName] = useState<string>("");
  const [key, setKey] = useState<string>("");
  
  const [availableSubServers, setAvailableSubServers] = useState<any[]>([]);
  const [availableDubServers, setAvailableDubServers] = useState<any[]>([]);

  const { auth, setAuth } = useAuthStore();
  const [autoSkip, setAutoSkip] = useState<boolean>(
    auth?.autoSkip || Boolean(localStorage.getItem("autoSkip")) || false
  );

  const {
    data: episodeData,
    isLoading,
    refetch,
  } = useGetEpisodeData(selectedEpisode, serverName, key, !!serverName);

  useEffect(() => {
    if (!serversData || serverName) return;

    const findWorkingServers = async () => {
      const subServers = serversData.sub || [];
      const dubServers = serversData.dub || [];

      const workingSub = [];
      for (const server of subServers) {
        try {
          const { data: newData, isSuccess } = await refetch({
            queryKey: [
              GET_EPISODE_DATA,
              selectedEpisode,
              server.serverName,
              "sub",
            ],
          });
          if (isSuccess && newData && newData.sources.length > 0) {
            workingSub.push(server);
          }
        } catch (error) {
          console.error(
            `Server ${server.serverName} (sub) failed:`,
            error
          );
        }
      }
      setAvailableSubServers(workingSub);

      const workingDub = [];
      for (const server of dubServers) {
        try {
          const { data: newData, isSuccess } = await refetch({
            queryKey: [
              GET_EPISODE_DATA,
              selectedEpisode,
              server.serverName,
              "dub",
            ],
          });
          if (isSuccess && newData && newData.sources.length > 0) {
            workingDub.push(server);
          }
        } catch (error) {
          console.error(
            `Server ${server.serverName} (dub) failed:`,
            error
          );
        }
      }
      setAvailableDubServers(workingDub);

      if (workingSub.length > 0) {
        setServerName(workingSub[0].serverName);
        setKey("sub");
      } else if (workingDub.length > 0) {
        setServerName(workingDub[0].serverName);
        setKey("dub");
      }
    };

    findWorkingServers();
  }, [serversData, selectedEpisode, refetch, serverName]);

  const [watchedDetails, setWatchedDetails] = useState<Array<IWatchedAnime>>(
    JSON.parse(localStorage.getItem("watched") as string) || []
  );

  function changeServer(newServerName: string, newKey: string) {
    setServerName(newServerName);
    setKey(newKey);
    const preference = { serverName: newServerName, key: newKey };
    localStorage.setItem("serverPreference", JSON.stringify(preference));
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

  if (isLoading && !episodeData)
    return (
      <div className="h-auto aspect-video lg:max-h-[calc(100vh-150px)] min-h-[20vh] sm:min-h-[30vh] md:min-h-[40vh] lg:min-h-[60vh] w-full animate-pulse bg-slate-700 rounded-md"></div>
    );

  return !episodeData || episodeData?.sources.length === 0 ? (
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
  ) : (
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
        subOrDub={key as "sub" | "dub"}
        autoSkip={autoSkip}
      />
      <div className="flex flex-row bg-[#0f172a]  items-start justify-between w-full p-5">
        <div>
          <div className="flex flex-row items-center space-x-5">
            <Captions className="text-red-300" />
            <p className="font-bold text-sm">SUB</p>
            {availableSubServers.map((s, i) => (
              <Button
                size="sm"
                key={i}
                className={`uppercase font-bold ${
                  serverName === s.serverName && key === "sub" && "bg-red-300"
                }`}
                onClick={() => changeServer(s.serverName, "sub")}
              >
                {s.serverName}
              </Button>
            ))}
          </div>
          {!!availableDubServers.length && (
            <div className="flex flex-row items-center space-x-5 mt-2">
              <Mic className="text-green-300" />
              <p className="font-bold text-sm">DUB</p>
              {availableDubServers.map((s, i) => (
                <Button
                  size="sm"
                  key={i}
                  className={`uppercase font-bold ${
                    serverName === s.serverName && key === "dub" && "bg-green-300"
                  }`}
                  onClick={() => changeServer(s.serverName, "dub")}
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
