use crate::domain::errors::ProviderError;
use crate::domain::provider::VideoSourceProvider;

pub struct ProviderRegistry {
    providers: Vec<Box<dyn VideoSourceProvider>>,
}

impl ProviderRegistry {
    pub fn new() -> Self {
        Self {
            providers: Vec::new(),
        }
    }

    pub fn register(&mut self, provider: Box<dyn VideoSourceProvider>) {
        self.providers.push(provider);
    }

    pub fn find_for_url(&self, url: &str) -> Result<&dyn VideoSourceProvider, ProviderError> {
        for p in &self.providers {
            if p.can_handle(url) {
                return Ok(p.as_ref());
            }
        }
        Err(ProviderError::UnsupportedUrl(format!(
            "No registered provider found to handle URL: {}",
            url
        )))
    }

    pub fn find_by_id(&self, id: &str) -> Result<&dyn VideoSourceProvider, ProviderError> {
        for p in &self.providers {
            if p.id() == id {
                return Ok(p.as_ref());
            }
        }
        Err(ProviderError::NotFound(format!(
            "Provider with id '{}' not found",
            id
        )))
    }
}
