pub mod parser;
pub mod client;

use async_trait::async_trait;
use crate::domain::episode::{Episode, Playlist, StreamSession};
use crate::domain::errors::ProviderError;
use crate::domain::provider::VideoSourceProvider;
use self::parser::Anime1Parser;
use self::client::Anime1Client;

pub struct Anime1Provider {
    client: Anime1Client,
}

impl Anime1Provider {
    pub fn new() -> Self {
        Self {
            client: Anime1Client::new(),
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
        Anime1Parser::parse_html(url, &html)
    }

    async fn resolve_stream(&self, episode: &Episode) -> Result<StreamSession, ProviderError> {
        self.client.resolve_stream(episode).await
    }
}
