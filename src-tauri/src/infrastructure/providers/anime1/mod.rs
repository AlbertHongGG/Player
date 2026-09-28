pub mod parser;
pub mod client;

use async_trait::async_trait;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::domain::episode::{Episode, Playlist, StreamSession, StoryboardTrack};
use crate::domain::errors::ProviderError;
use crate::domain::provider::VideoSourceProvider;
use self::parser::{Anime1Parser, Anime1Payload};
use self::client::Anime1Client;

pub struct Anime1Provider {
    client: Anime1Client,
    payloads: Arc<RwLock<HashMap<String, (Anime1Payload, Option<StoryboardTrack>)>>>,
}

impl Anime1Provider {
    pub fn new() -> Self {
        Self {
            client: Anime1Client::new(),
            payloads: Arc::new(RwLock::new(HashMap::new())),
        }
    }
}

#[async_trait]
impl VideoSourceProvider for Anime1Provider {
    fn id(&self) -> &'static str {
        "anime1"
    }

    fn can_handle(&self, url: &str) -> bool {
        url.contains("anime1.me")
    }

    async fn parse_playlist(&self, url: &str) -> Result<Playlist, ProviderError> {
        let html = self.client.fetch_page(url).await?;
        let (playlist, payloads) = Anime1Parser::parse_html(url, &html)?;

        // Cache payloads internally
        {
            let mut map = self.payloads.write().await;
            for (ep_id, p, sb) in payloads {
                map.insert(ep_id, (p, sb));
            }
        }

        Ok(playlist)
    }

    async fn resolve_stream(&self, episode: &Episode) -> Result<StreamSession, ProviderError> {
        let (payload, storyboard) = {
            let map = self.payloads.read().await;
            map.get(&episode.id)
                .cloned()
                .ok_or_else(|| ProviderError::NotFound(format!("No authentication payload found for episode {}", episode.id)))?
        };

        let mut session = self.client.resolve_stream(&episode.id, &payload).await?;
        session.storyboard = storyboard.or_else(|| episode.storyboard.clone());
        Ok(session)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_live_anime1_flow() {
        let provider = Anime1Provider::new();
        let test_url = "https://anime1.me/category/2018%e5%b9%b4%e5%86%ac%e5%ad%a3/%e6%90%96%e6%9b%b3%e9%9c%b2%e7%87%9f%e2%96%b3";
        
        let playlist = match provider.parse_playlist(test_url).await {
            Ok(p) => p,
            Err(e) => {
                println!("Network offline or Anime1 unreachable: {}", e);
                return;
            }
        };

        assert!(!playlist.episodes.is_empty(), "Expected episodes to be found");
        println!("Found {} episodes for {}", playlist.episodes.len(), playlist.title);
        for (i, ep) in playlist.episodes.iter().enumerate() {
            println!("  [{}] {} | {:?}", i + 1, ep.title, ep.published_at);
        }

        let first_ep = &playlist.episodes[0];
        println!("Resolving first episode: {} ({})", first_ep.title, first_ep.id);

        let (payload, _sb) = {
            let map = provider.payloads.read().await;
            map.get(&first_ep.id).cloned().expect("Payload must exist")
        };
        println!("Payload: {:?}", payload);

        let session = provider.resolve_stream(first_ep).await.expect("Failed to resolve stream");
        assert!(!session.stream_url.is_empty(), "Stream URL should not be empty");
        assert!(!session.cookie_header.is_empty(), "Cookie header should not be empty");
        println!("Stream resolved successfully: {}", session.stream_url);
        println!("Cookie header: {}", session.cookie_header);
        println!("Storyboard: {:?}", session.storyboard);
    }
}
