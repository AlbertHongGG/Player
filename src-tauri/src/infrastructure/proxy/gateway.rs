use axum::{
    body::Body,
    extract::{Path, State},
    http::{HeaderMap, StatusCode},
    response::Response,
    routing::get,
    Router,
};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tower_http::cors::CorsLayer;

use crate::domain::episode::StreamSession;

pub struct GatewayState {
    sessions: RwLock<HashMap<String, StreamSession>>,
    client: reqwest::Client,
}

#[derive(Clone)]
pub struct StreamingGateway {
    state: Arc<GatewayState>,
    port: u16,
}

impl StreamingGateway {
    pub async fn start() -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        let state = Arc::new(GatewayState {
            sessions: RwLock::new(HashMap::new()),
            client: reqwest::Client::builder().build()?,
        });

        let app = Router::new()
            .route("/stream/{session_id}", get(handle_stream))
            .layer(CorsLayer::permissive())
            .with_state(state.clone());

        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await?;
        let addr = listener.local_addr()?;
        let port = addr.port();

        println!("Streaming Gateway started at http://127.0.0.1:{}", port);

        tokio::spawn(async move {
            if let Err(e) = axum::serve(listener, app).await {
                eprintln!("Streaming Gateway error: {}", e);
            }
        });

        Ok(Self { state, port })
    }

    pub fn port(&self) -> u16 {
        self.port
    }

    pub async fn register_session(&self, session: StreamSession) {
        let mut map = self.state.sessions.write().await;
        map.insert(session.session_id.clone(), session);
    }

    pub fn get_stream_url(&self, session_id: &str) -> String {
        format!("http://127.0.0.1:{}/stream/{}", self.port, session_id)
    }
}

async fn handle_stream(
    Path(session_id): Path<String>,
    headers: HeaderMap,
    State(state): State<Arc<GatewayState>>,
) -> Result<Response, StatusCode> {
    let session = {
        let map = state.sessions.read().await;
        map.get(&session_id).cloned()
    };

    let session = match session {
        Some(s) => s,
        None => return Err(StatusCode::NOT_FOUND),
    };

    let mut req_builder = state.client.get(&session.stream_url);

    if !session.user_agent.is_empty() {
        req_builder = req_builder.header(reqwest::header::USER_AGENT, &session.user_agent);
    }
    if !session.referer.is_empty() {
        req_builder = req_builder.header(reqwest::header::REFERER, &session.referer);
    }
    if !session.cookie_header.is_empty() {
        req_builder = req_builder.header(reqwest::header::COOKIE, &session.cookie_header);
    }

    // Forward Range header if present
    if let Some(range) = headers.get("range") {
        if let Ok(range_str) = range.to_str() {
            req_builder = req_builder.header("Range", range_str);
        }
    }

    let upstream_resp = req_builder.send().await.map_err(|e| {
        eprintln!("Failed to proxy request to {}: {}", session.stream_url, e);
        StatusCode::BAD_GATEWAY
    })?;

    let status = StatusCode::from_u16(upstream_resp.status().as_u16())
        .unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);

    let mut response_builder = Response::builder().status(status);

    // Forward essential media headers
    if let Some(val) = upstream_resp.headers().get("content-range") {
        response_builder = response_builder.header("content-range", val.as_bytes());
    }
    if let Some(val) = upstream_resp.headers().get("content-length") {
        response_builder = response_builder.header("content-length", val.as_bytes());
    }
    if let Some(val) = upstream_resp.headers().get("content-type") {
        response_builder = response_builder.header("content-type", val.as_bytes());
    } else {
        response_builder = response_builder.header("content-type", "video/mp4");
    }

    response_builder = response_builder
        .header("accept-ranges", "bytes")
        .header("access-control-allow-origin", "*")
        .header("access-control-allow-headers", "*")
        .header("cache-control", "no-cache");

    let stream = upstream_resp.bytes_stream();
    let body = Body::from_stream(stream);

    response_builder
        .body(body)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}
