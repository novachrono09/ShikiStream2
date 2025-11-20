import { hianime } from "@/lib/hianime";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const episodeId = searchParams.get("animeEpisodeId") as string;
    const server = searchParams.get("server") as
      | "hd-1"
      | "hd-2"
      | "megacloud"
      | "streamsb"
      | "streamtape";
    const category = searchParams.get("category") as "sub" | "dub" | "raw";

    console.log("=======================================");
    console.log("Fetching episode sources with params:");
    console.log({ episodeId, server, category });
    console.log("=======================================");

    const data = await hianime.getEpisodeSources(
      decodeURIComponent(episodeId),
      server,
      category,
    );

    console.log("=======================================");
    console.log("Received data from hianime:");
    console.log(JSON.stringify(data, null, 2));
    console.log("=======================================");

    return Response.json({ data });
  } catch (err) {
    console.error("=======================================");
    console.error("Error in /api/episode/sources:");
    console.error(err);
    console.error("=======================================");
    return Response.json({ error: "something went wrong" }, { status: 500 });
  }
}
