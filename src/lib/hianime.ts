import { HiAnime } from "aniwatch";

const proxyUrl = process.env.NEXT_PUBLIC_PROXY_URL;

export const hianime = new HiAnime.Scraper(proxyUrl);
