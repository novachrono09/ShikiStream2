import { IEpisodeServers } from "@/types/episodes";

type Preference = {
  server: string;
  key: "sub" | "dub" | "raw";
};

export function getFallbackServer(serversData: IEpisodeServers | undefined): {
  serverName: string;
  key: string;
} {
  const preference = localStorage.getItem("serverPreference");

  if (preference) {
    const parsedPreference = JSON.parse(preference) as Preference;
    if (parsedPreference?.key) {
      const serverList = serversData?.[parsedPreference.key];
      if (serverList && serverList[0]?.serverName) {
        return {
          serverName: serverList[0].serverName,
          key: parsedPreference.key,
        };
      }
    }
  }

  if (serversData) {
    // Prioritize "vidstreaming" server for "sub" category
    const subServers = serversData.sub || [];
    const vidstreamingServer = subServers.find(s => s.serverName === "vidstreaming");
    if (vidstreamingServer) {
      return {
        serverName: vidstreamingServer.serverName,
        key: "sub",
      };
    }

    const keys: Array<"sub" | "dub" | "raw"> = ["sub", "dub", "raw"];
    for (const key of keys) {
      const serverList = serversData[key];
      if (serverList && serverList[0]?.serverName) {
        return {
          serverName: serverList[0].serverName,
          key,
        };
      }
    }
  }
  return {
    serverName: "",
    key: "",
  };
}