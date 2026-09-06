use async_trait::async_trait;
use crate::domain::episode::{Episode, Playlist, StreamSession};
use crate::domain::errors::ProviderError;

#[async_trait]
pub trait VideoSourceProvider: Send + Sync {
    fn id(&self) -> &'static str;
    fn can_handle(&self, url: &str) -> bool;
    async fn parse_playlist(&self, url: &str) -> Result<Playlist, ProviderError>;
    async fn resolve_stream(&self, episode: &Episode) -> Result<StreamSession, ProviderError>;
}
