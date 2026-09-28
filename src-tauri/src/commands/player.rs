use tauri::State;
use crate::domain::episode::{PlayableStreamDto, Playlist};
use crate::infrastructure::state::AppState;

#[tauri::command]
#[specta::specta]
pub async fn parse_url(state: State<'_, AppState>, url: String) -> Result<Playlist, String> {
    let registry = state.registry.read().await;
    let provider = registry.find_for_url(&url).map_err(|e| e.to_string())?;

    let playlist = provider.parse_playlist(&url).await.map_err(|e| e.to_string())?;

    // Cache playlist and episodes
    {
        let mut cache = state.episode_cache.write().await;
        cache.clear();
        for ep in &playlist.episodes {
            cache.insert(ep.id.clone(), ep.clone());
        }

        let mut curr = state.current_playlist.write().await;
        *curr = Some(playlist.clone());
    }

    Ok(playlist)
}

#[tauri::command]
#[specta::specta]
pub async fn resolve_episode(
    state: State<'_, AppState>,
    provider_id: String,
    episode_id: String,
) -> Result<PlayableStreamDto, String> {
    let episode = {
        let cache = state.episode_cache.read().await;
        cache
            .get(&episode_id)
            .cloned()
            .ok_or_else(|| format!("Episode '{}' not found in cache", episode_id))?
    };

    let registry = state.registry.read().await;
    let provider = registry.find_by_id(&provider_id).map_err(|e| e.to_string())?;

    let session = provider.resolve_stream(&episode).await.map_err(|e| e.to_string())?;

    let storyboard = session.storyboard.clone();
    let session_id = session.session_id.clone();
    state.gateway.register_session(session).await;

    let stream_url = state.gateway.get_stream_url(&session_id);

    Ok(PlayableStreamDto {
        session_id,
        stream_url,
        episode_id,
        storyboard,
    })
}

#[tauri::command]
#[specta::specta]
pub async fn get_gateway_port(state: State<'_, AppState>) -> Result<u16, String> {
    Ok(state.gateway.port())
}
