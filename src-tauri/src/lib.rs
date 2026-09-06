use tauri::Manager;

pub mod commands;
pub mod domain;
pub mod infrastructure;

pub use commands::create_builder;

pub fn run() {
    let builder = commands::create_builder();

    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle().clone();

            // Run async gateway setup inside tokio runtime
            tauri::async_runtime::block_on(async move {
                let gateway = match infrastructure::proxy::gateway::StreamingGateway::start().await {
                    Ok(gw) => gw,
                    Err(e) => {
                        eprintln!("Failed to start Streaming Gateway: {}", e);
                        panic!("Cannot start streaming gateway");
                    }
                };

                let mut registry = infrastructure::registry::ProviderRegistry::new();
                registry.register(Box::new(infrastructure::providers::anime1::Anime1Provider::new()));

                let state = infrastructure::state::AppState::new(registry, gateway);
                handle.manage(state);
            });

            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(builder.invoke_handler())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
