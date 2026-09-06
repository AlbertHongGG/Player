pub mod player;

pub fn create_builder() -> tauri_specta::Builder<tauri::Wry> {
    tauri_specta::Builder::<tauri::Wry>::new()
        .commands(tauri_specta::collect_commands![
            player::parse_url,
            player::resolve_episode,
            player::get_gateway_port,
        ])
}
