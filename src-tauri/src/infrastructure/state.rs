use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::domain::episode::{Episode, Playlist};
use crate::infrastructure::proxy::gateway::StreamingGateway;
use crate::infrastructure::registry::ProviderRegistry;

pub struct AppState {
    pub registry: Arc<RwLock<ProviderRegistry>>,
    pub gateway: StreamingGateway,
    pub current_playlist: Arc<RwLock<Option<Playlist>>>,
    pub episode_cache: Arc<RwLock<HashMap<String, Episode>>>,
}

impl AppState {
    pub fn new(registry: ProviderRegistry, gateway: StreamingGateway) -> Self {
        Self {
            registry: Arc::new(RwLock::new(registry)),
            gateway,
            current_playlist: Arc::new(RwLock::new(None)),
            episode_cache: Arc::new(RwLock::new(HashMap::new())),
        }
    }
}
