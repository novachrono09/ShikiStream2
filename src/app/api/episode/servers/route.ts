import Aniwave from 'aniwave-scraper';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const animeEpisodeId = searchParams.get("animeEpisodeId") as string;

    const scraper = new (Aniwave as any).default();
    const data = await scraper.getEpisodeServers(animeEpisodeId);

    return Response.json({ data });
  } catch (err) {
    console.log(err);
    return Response.json({ error: "something went wrong" }, { status: 500 });
  }
}
