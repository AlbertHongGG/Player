use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct Episode {
    pub id: String,
    pub title: String,
    pub published_at: Option<String>,
    pub article_url: Option<String>,
    pub player_index: u32,
    pub provider_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct Playlist {
    pub title: String,
    pub url: String,
    pub provider_id: String,
    pub episodes: Vec<Episode>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamSession {
    pub session_id: String,
    pub stream_url: String,
    pub cookie_header: String,
    pub referer: String,
    pub user_agent: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct PlayableStreamDto {
    pub session_id: String,
    pub stream_url: String,
    pub episode_id: String,
    pub title: String,
}
