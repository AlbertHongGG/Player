use reqwest::header::{HeaderMap, HeaderValue, ACCEPT, CONTENT_TYPE, ORIGIN, REFERER, USER_AGENT};
use serde_json::Value;
use std::error::Error as StdError;
use std::time::Duration;
use uuid::Uuid;

use crate::domain::episode::StreamSession;
use crate::domain::errors::ProviderError;
use crate::infrastructure::providers::anime1::parser::Anime1Payload;

const USER_AGENT_STR: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const API_ENDPOINT: &str = "https://v.anime1.me/api";
const SITE_ORIGIN: &str = "https://anime1.me";
const SITE_REFERER: &str = "https://anime1.me/";

pub struct Anime1Client {
    client: reqwest::Client,
}

impl Anime1Client {
    pub fn new() -> Self {
        let client = reqwest::Client::builder()
            .timeout(Duration::from_secs(20))
            .pool_idle_timeout(Duration::from_secs(30))
            .http2_adaptive_window(true)
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());

        Self { client }
    }

    pub async fn fetch_page(&self, url: &str) -> Result<String, ProviderError> {
        let resp = self
            .client
            .get(url)
            .header(USER_AGENT, USER_AGENT_STR)
            .header(REFERER, SITE_REFERER)
            .header(ACCEPT, "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
            .send()
            .await
            .map_err(|e| {
                let mut detail = format!("Failed to fetch page {}: {}", url, e);
                let mut src = e.source();
                while let Some(s) = src {
                    detail.push_str(&format!(" -> Caused by: {}", s));
                    src = s.source();
                }
                ProviderError::Network(detail)
            })?;

        let status = resp.status();
        if !status.is_success() {
            return Err(ProviderError::Network(format!(
                "Page returned HTTP {}: {}",
                status, url
            )));
        }

        let html = resp
            .text()
            .await
            .map_err(|e| ProviderError::Network(format!("Failed to read response body: {}", e)))?;

        Ok(html)
    }

    pub async fn resolve_stream(
        &self,
        episode_id: &str,
        payload: &Anime1Payload,
    ) -> Result<StreamSession, ProviderError> {
        let payload_json = serde_json::to_string(payload)
            .map_err(|e| ProviderError::Api(format!("Failed to serialize payload: {}", e)))?;

        let mut headers = HeaderMap::new();
        headers.insert(USER_AGENT, HeaderValue::from_static(USER_AGENT_STR));
        headers.insert(ORIGIN, HeaderValue::from_static(SITE_ORIGIN));
        headers.insert(REFERER, HeaderValue::from_static(SITE_REFERER));
        headers.insert(ACCEPT, HeaderValue::from_static("*/*"));
        headers.insert(
            CONTENT_TYPE,
            HeaderValue::from_static("application/x-www-form-urlencoded"),
        );

        let params = [("d", payload_json)];

        let resp = self
            .client
            .post(API_ENDPOINT)
            .headers(headers)
            .form(&params)
            .send()
            .await
            .map_err(|e| {
                let mut detail = format!("Failed to call {}: {}", API_ENDPOINT, e);
                let mut src = e.source();
                while let Some(s) = src {
                    detail.push_str(&format!(" -> Caused by: {}", s));
                    src = s.source();
                }
                ProviderError::Api(detail)
            })?;

        let status = resp.status();
        if !status.is_success() {
            return Err(ProviderError::Api(format!(
                "API returned HTTP {}: for episode {}",
                status, episode_id
            )));
        }

        // Extract Set-Cookie headers (e, p, h)
        let mut cookie_pairs = Vec::new();
        for cookie_val in resp.headers().get_all("set-cookie") {
            if let Ok(val_str) = cookie_val.to_str() {
                if let Some(cookie_part) = val_str.split(';').next() {
                    let trimmed = cookie_part.trim();
                    if trimmed.starts_with("e=") || trimmed.starts_with("p=") || trimmed.starts_with("h=") {
                        cookie_pairs.push(trimmed.to_string());
                    }
                }
            }
        }
        let cookie_header = cookie_pairs.join("; ");

        let body_json: Value = resp
            .json()
            .await
            .map_err(|e| ProviderError::Api(format!("Failed to parse JSON response: {}", e)))?;

        // Format: {"s": [{"src": "//nemo.v.anime1.me/...", "type": "video/mp4"}]}
        let raw_src = body_json
            .get("s")
            .and_then(|s| s.as_array())
            .and_then(|arr| arr.first())
            .and_then(|item| item.get("src"))
            .and_then(|src| src.as_str())
            .ok_or_else(|| {
                ProviderError::Api(format!(
                    "No stream source found in API response: {:?}",
                    body_json
                ))
            })?;

        let stream_url = if raw_src.starts_with("//") {
            format!("https:{}", raw_src)
        } else {
            raw_src.to_string()
        };

        let session_id = Uuid::new_v4().to_string();

        Ok(StreamSession {
            session_id,
            stream_url,
            cookie_header,
            referer: SITE_REFERER.to_string(),
            user_agent: USER_AGENT_STR.to_string(),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_direct_api_call() {
        let client = Anime1Client::new();
        let payload = Anime1Payload {
            c: "256".to_string(),
            e: "1".to_string(),
            t: 1788701772,
            p: 5,
            s: "699d175fd2f5618df0ce268d0b71ef95".to_string(),
        };
        let res = client.resolve_stream("test_1", &payload).await;
        println!("Result: {:?}", res);
        assert!(res.is_ok());
    }
}
