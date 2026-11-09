use std::fmt;
use std::str::FromStr;
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use url::Url;

use crate::domain::errors::ProviderError;

/// Domain Value Object representing an anime source URL.
/// Encapsulates RFC-3986 wire formatting and human-readable display representations.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SourceUrl {
    inner: Url,
}

impl SourceUrl {
    /// Parses any user or clipboard URL string, auto-handling missing schemes and percent encodings.
    pub fn parse(input: &str) -> Result<Self, ProviderError> {
        let trimmed = input.trim();
        if trimmed.is_empty() {
            return Err(ProviderError::UnsupportedUrl("URL cannot be empty".to_string()));
        }

        let formatted = if !trimmed.contains("://") && (trimmed.starts_with("anime1.me") || trimmed.contains('.')) {
            format!("https://{}", trimmed)
        } else {
            trimmed.to_string()
        };

        let inner = Url::parse(&formatted)
            .map_err(|e| ProviderError::UnsupportedUrl(format!("Invalid URL '{}': {}", input, e)))?;

        Ok(Self { inner })
    }

    /// Returns the underlying WHATWG `Url` reference.
    pub fn as_url(&self) -> &Url {
        &self.inner
    }

    /// Returns the canonical RFC-3986 wire string (used for network/HTTP requests).
    pub fn as_str(&self) -> &str {
        self.inner.as_str()
    }

    /// Returns a clean, human-readable display string (decoding UTF-8 percent-encoded path and query).
    pub fn to_display_string(&self) -> String {
        let scheme = self.inner.scheme();
        let host = self.inner.host_str().unwrap_or("");
        let port_part = match self.inner.port() {
            Some(p) => format!(":{}", p),
            None => String::new(),
        };

        let path = self.inner.path();
        let decoded_path = urlencoding::decode(path).unwrap_or(std::borrow::Cow::Borrowed(path));

        let query_part = match self.inner.query() {
            Some(q) => {
                let decoded_q = urlencoding::decode(q).unwrap_or(std::borrow::Cow::Borrowed(q));
                format!("?{}", decoded_q)
            }
            None => String::new(),
        };

        let fragment_part = match self.inner.fragment() {
            Some(f) => {
                let decoded_f = urlencoding::decode(f).unwrap_or(std::borrow::Cow::Borrowed(f));
                format!("#{}", decoded_f)
            }
            None => String::new(),
        };

        format!("{}://{}{}{}{}{}", scheme, host, port_part, decoded_path, query_part, fragment_part)
    }

    /// Returns the host part of the URL, if any.
    pub fn host_str(&self) -> Option<&str> {
        self.inner.host_str()
    }

    /// Checks if this URL matches the given domain (including subdomains).
    pub fn matches_host(&self, expected_host: &str) -> bool {
        if let Some(host) = self.inner.host_str() {
            host.eq_ignore_ascii_case(expected_host)
                || host.to_lowercase().ends_with(&format!(".{}", expected_host.to_lowercase()))
        } else {
            false
        }
    }
}

impl fmt::Display for SourceUrl {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

impl FromStr for SourceUrl {
    type Err = ProviderError;

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        Self::parse(s)
    }
}

impl Serialize for SourceUrl {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_str(self.as_str())
    }
}

impl<'de> Deserialize<'de> for SourceUrl {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let s = String::deserialize(deserializer)?;
        SourceUrl::parse(&s).map_err(serde::de::Error::custom)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_and_display() {
        let input = "https://anime1.me/category/2026%e5%b9%b4%e6%98%a5%e5%ad%a3/";
        let source_url = SourceUrl::parse(input).expect("Should parse");
        assert_eq!(source_url.to_display_string(), "https://anime1.me/category/2026年春季/");
        assert!(source_url.as_str().to_lowercase().contains("2026%e5%b9%b4"));
        assert!(source_url.matches_host("anime1.me"));
    }

    #[test]
    fn test_auto_https_scheme() {
        let input = "anime1.me/category/2026%e5%b9%b4%e6%98%a5%e5%ad%a3/";
        let source_url = SourceUrl::parse(input).expect("Should parse");
        assert_eq!(source_url.to_display_string(), "https://anime1.me/category/2026年春季/");
        assert_eq!(source_url.host_str(), Some("anime1.me"));
    }
}
