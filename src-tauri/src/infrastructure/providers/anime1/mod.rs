pub mod parser;
pub mod client;

use async_trait::async_trait;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::domain::episode::{Episode, Playlist, StreamSession};
use crate::domain::errors::ProviderError;
use crate::domain::provider::VideoSourceProvider;
use crate::domain::url::SourceUrl;
use self::parser::{Anime1Parser, Anime1Payload};
use self::client::Anime1Client;

pub struct Anime1Provider {
    client: Anime1Client,
    payloads: Arc<RwLock<HashMap<String, Anime1Payload>>>,
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
        if let Ok(source_url) = SourceUrl::parse(url) {
            source_url.matches_host("anime1.me")
        } else {
            url.contains("anime1.me")
        }
    }

    async fn parse_playlist(&self, url: &str) -> Result<Playlist, ProviderError> {
        let source_url = SourceUrl::parse(url)?;
        // Normalize to canonical URL (Page 1) to ensure traversal collects all pages
        let canonical_url = source_url.to_canonical();
        let canonical_display = canonical_url.to_display_string();

        let mut current_fetch_url = canonical_url.as_str().to_string();
        let mut all_articles = Vec::new();
        let mut playlist_title = String::new();
        let mut visited_urls = std::collections::HashSet::new();

        const MAX_PAGES: usize = 20;
        let mut page_count = 0;

        while page_count < MAX_PAGES {
            if !visited_urls.insert(current_fetch_url.clone()) {
                break;
            }
            page_count += 1;

            let html = self.client.fetch_page(&current_fetch_url).await?;
            let parsed_page = Anime1Parser::parse_single_page(&html)?;

            if playlist_title.is_empty() && !parsed_page.title.is_empty() {
                playlist_title = parsed_page.title;
            }

            all_articles.extend(parsed_page.articles);

            if let Some(next_url) = parsed_page.next_page_url {
                current_fetch_url = next_url;
            } else {
                break;
            }
        }

        if playlist_title.is_empty() {
            playlist_title = "Anime Playlist".to_string();
        }

        let (playlist, payloads) = Anime1Parser::assemble_playlist(
            &canonical_display,
            &playlist_title,
            all_articles,
        )?;

        // Cache payloads internally
        {
            let mut map = self.payloads.write().await;
            for (ep_id, p) in payloads {
                map.insert(ep_id, p);
            }
        }

        Ok(playlist)
    }

    async fn resolve_stream(&self, episode: &Episode) -> Result<StreamSession, ProviderError> {
        let payload = {
            let map = self.payloads.read().await;
            map.get(&episode.id)
                .cloned()
                .ok_or_else(|| ProviderError::NotFound(format!("No authentication payload found for episode {}", episode.id)))?
        };

        let session = self.client.resolve_stream(&episode.id, &payload).await?;
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

        let payload = {
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
