use thiserror::Error;

#[derive(Error, Debug, specta::Type, serde::Serialize)]
pub enum ProviderError {
    #[error("Network error: {0}")]
    Network(String),
    #[error("HTML Parse error: {0}")]
    Parse(String),
    #[error("API error: {0}")]
    Api(String),
    #[error("Not found: {0}")]
    NotFound(String),
    #[error("Unsupported URL: {0}")]
    UnsupportedUrl(String),
    #[error("Internal error: {0}")]
    Internal(String),
}
