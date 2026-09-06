import { invoke as __TAURI_INVOKE } from "@tauri-apps/api/core";

export const commands = {
  parseUrl: (url: string) => typedError<Playlist, string>(__TAURI_INVOKE("parse_url", { url })),
  resolveEpisode: (providerId: string, episodeId: string) =>
    typedError<PlayableStreamDto, string>(
      __TAURI_INVOKE("resolve_episode", { providerId, episodeId })
    ),
  getGatewayPort: () => typedError<number, string>(__TAURI_INVOKE("get_gateway_port")),
};

export type ApiReqPayload = {
  c: string;
  e: string;
  t: number;
  p: number;
  s: string;
};

export type Episode = {
  id: string;
  title: string;
  published_at: string | null;
  article_url: string | null;
  player_index: number;
  provider_id: string;
  payload: ApiReqPayload;
};

export type Playlist = {
  title: string;
  url: string;
  provider_id: string;
  episodes: Episode[];
};

export type PlayableStreamDto = {
  session_id: string;
  stream_url: string;
  episode_id: string;
  title: string;
};

async function typedError<T, E>(
  result: Promise<T>
): Promise<{ status: "ok"; data: T } | { status: "error"; error: E }> {
  try {
    return { status: "ok", data: await result };
  } catch (e) {
    if (e instanceof Error) throw e;
    return { status: "error", error: e as any };
  }
}
