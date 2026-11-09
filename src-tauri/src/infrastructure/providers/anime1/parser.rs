use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};

use crate::domain::episode::{Episode, Playlist, StoryboardTrack};
use crate::domain::errors::ProviderError;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Anime1Payload {
    pub c: String,
    pub e: String,
    pub t: i64,
    pub p: i32,
    pub s: String,
}

#[derive(Debug, Clone)]
pub struct ParsedRawPlayer {
    pub player_index: u32,
    pub raw_payload: Anime1Payload,
    pub storyboard: Option<StoryboardTrack>,
}

#[derive(Debug, Clone)]
pub struct ParsedArticle {
    pub article_id: String,
    pub title: String,
    pub article_url: Option<String>,
    pub published_at: Option<String>,
    pub raw_players: Vec<ParsedRawPlayer>,
}

#[derive(Debug, Clone)]
pub struct ParsedPage {
    pub title: String,
    pub articles: Vec<ParsedArticle>,
    pub next_page_url: Option<String>,
}

pub struct Anime1Parser;

impl Anime1Parser {
    /// Parses a single HTML page, extracting its title, all articles on this page,
    /// and any pagination link pointing to older posts / next page.
    pub fn parse_single_page(html_content: &str) -> Result<ParsedPage, ProviderError> {
        let document = Html::parse_document(html_content);

        // 1. Extract Title
        let page_title_sel = Selector::parse("h1.page-title, h1.entry-title")
            .map_err(|e| ProviderError::Parse(e.to_string()))?;
        let doc_title_sel = Selector::parse("title")
            .map_err(|e| ProviderError::Parse(e.to_string()))?;

        let raw_title = document
            .select(&page_title_sel)
            .next()
            .or_else(|| document.select(&doc_title_sel).next())
            .map(|el| el.text().collect::<Vec<_>>().join(" ").trim().to_string())
            .unwrap_or_else(|| "Anime Playlist".to_string());

        let cleaned_title = raw_title
            .replace("分類:", "")
            .replace("分類：", "")
            .replace("Category:", "")
            .replace("– Anime1.me 動畫線上看", "")
            .replace("- Anime1.me 動畫線上看", "")
            .replace("Anime1.me 動畫線上看", "")
            .replace("– Anime1.me", "")
            .replace("- Anime1.me", "")
            .replace("Anime1.me", "")
            .trim()
            .to_string();

        // 2. Extract next page / older posts pagination link
        let next_page_sel = Selector::parse(
            "div.nav-previous a, li.nav-previous a, a.next.page-numbers, .pagination a.next, nav.posts-navigation a[href*='/page/']"
        ).map_err(|e| ProviderError::Parse(e.to_string()))?;

        let next_page_url = document
            .select(&next_page_sel)
            .next()
            .and_then(|el| el.value().attr("href"))
            .map(|href| {
                let trimmed = href.trim();
                if trimmed.starts_with('/') {
                    format!("https://anime1.me{}", trimmed)
                } else {
                    trimmed.to_string()
                }
            });

        // 3. Select articles
        let article_sel = Selector::parse("article").map_err(|e| ProviderError::Parse(e.to_string()))?;
        let entry_title_sel = Selector::parse(
            "header.entry-header h2.entry-title a, header.entry-header h1.entry-title a, h2.entry-title, h1.entry-title",
        )
        .map_err(|e| ProviderError::Parse(e.to_string()))?;
        let date_sel = Selector::parse("time.entry-date, time[datetime]")
            .map_err(|e| ProviderError::Parse(e.to_string()))?;
        let apireq_sel = Selector::parse("[data-apireq]")
            .map_err(|e| ProviderError::Parse(e.to_string()))?;

        let mut articles = Vec::new();

        for article in document.select(&article_sel) {
            let article_id = article.value().attr("id").unwrap_or("unknown_article").to_string();

            let mut ep_title = String::new();
            let mut article_url = None;
            if let Some(title_el) = article.select(&entry_title_sel).next() {
                ep_title = title_el.text().collect::<Vec<_>>().join(" ").trim().to_string();
                if let Some(href) = title_el.value().attr("href") {
                    article_url = Some(href.to_string());
                }
            }
            if ep_title.is_empty() {
                ep_title = article_id.clone();
            }

            let published_at = article
                .select(&date_sel)
                .next()
                .and_then(|el| {
                    el.value()
                        .attr("datetime")
                        .map(|s| s.trim().to_string())
                        .or_else(|| {
                            let t = el.text().collect::<String>().trim().to_string();
                            if t.is_empty() { None } else { Some(t) }
                        })
                });

            let mut raw_players = Vec::new();
            let mut player_index: u32 = 1;
            for req_el in article.select(&apireq_sel) {
                if let Some(raw_req) = req_el.value().attr("data-apireq") {
                    let decoded = urlencoding::decode(raw_req)
                        .map_err(|e| ProviderError::Parse(e.to_string()))?;
                    let payload: Anime1Payload = match serde_json::from_str(&decoded) {
                        Ok(p) => p,
                        Err(e) => {
                            eprintln!(
                                "Warning: Failed to parse data-apireq JSON: {}, error: {}",
                                decoded, e
                            );
                            continue;
                        }
                    };

                    let vid = req_el.value().attr("data-vid").map(|s| s.trim().to_string());
                    let tserver = req_el.value().attr("data-tserver").map(|s| s.trim().to_string());
                    let storyboard = match (&vid, &tserver) {
                        (Some(v), Some(t)) if !v.is_empty() && !t.is_empty() => Some(StoryboardTrack {
                            sprite_url: format!("https://{}.anime1.me/{}/thumbnails.jpg", t, v),
                            tile_width: 192,
                            tile_height: 108,
                            columns: 10,
                            interval_seconds: 3.0,
                        }),
                        _ => None,
                    };

                    raw_players.push(ParsedRawPlayer {
                        player_index,
                        raw_payload: payload,
                        storyboard,
                    });
                    player_index += 1;
                }
            }

            articles.push(ParsedArticle {
                article_id,
                title: ep_title,
                article_url,
                published_at,
                raw_players,
            });
        }

        Ok(ParsedPage {
            title: cleaned_title,
            articles,
            next_page_url,
        })
    }

    /// Assembles an aggregated list of articles collected across pages into a unified Playlist.
    /// Deduplicates articles and reverses page order so Episode 1 appears first in chronological order.
    pub fn assemble_playlist(
        canonical_url: &str,
        title: &str,
        articles: Vec<ParsedArticle>,
    ) -> Result<(Playlist, Vec<(String, Anime1Payload)>), ProviderError> {
        // Deduplicate articles by article_id preserving order
        let mut seen_ids = std::collections::HashSet::new();
        let mut deduplicated: Vec<ParsedArticle> = Vec::new();
        for art in articles {
            if seen_ids.insert(art.article_id.clone()) {
                deduplicated.push(art);
            }
        }

        // Anime1 lists articles in reverse chronological order (newest on top).
        // Traversal of pages (Page 1 -> Page 2 -> ...) collects newest articles first.
        // Reversing the deduplicated list places Episode 1 first!
        deduplicated.reverse();

        let mut episodes = Vec::new();
        let mut payloads = Vec::new();

        for article in deduplicated {
            let total_players = article.raw_players.len();
            for player in article.raw_players {
                let ep_id = if player.player_index == 1 {
                    format!("{}_{}", article.article_id, player.raw_payload.e)
                } else {
                    format!("{}_{}_p{}", article.article_id, player.raw_payload.e, player.player_index)
                };

                let final_title = if total_players > 1 {
                    format!("{} (Part {})", article.title, player.player_index)
                } else {
                    article.title.clone()
                };

                payloads.push((ep_id.clone(), player.raw_payload));

                episodes.push(Episode {
                    id: ep_id,
                    title: final_title,
                    published_at: article.published_at.clone(),
                    article_url: article.article_url.clone(),
                    player_index: player.player_index,
                    provider_id: "anime1".to_string(),
                    storyboard: player.storyboard,
                });
            }
        }

        Ok((
            Playlist {
                title: title.to_string(),
                url: canonical_url.to_string(),
                provider_id: "anime1".to_string(),
                episodes,
            },
            payloads,
        ))
    }

    /// Single-page convenience wrapper for backward compatibility and tests
    pub fn parse_html(
        url: &str,
        html_content: &str,
    ) -> Result<(Playlist, Vec<(String, Anime1Payload)>), ProviderError> {
        let page = Self::parse_single_page(html_content)?;
        Self::assemble_playlist(url, &page.title, page.articles)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_sample_html() {
        let html = r#"
        <!DOCTYPE html>
        <html>
        <head><title>搖曳露營△ – Anime1.me 動畫線上看</title></head>
        <body>
        <main id="main" class="site-main">
            <header class="page-header"><h1 class="page-title">分類: 搖曳露營△</h1></header>
            <article id="post-4786">
                <header class="entry-header">
                    <h2 class="entry-title"><a href="https://anime1.me/4786">搖曳露營△ [BD特典SP]</a></h2>
                    <time class="entry-date" datetime="2018-04-01T11:09:17+08:00">2018-04-01</time>
                </header>
                <div class="entry-content">
                    <div class="vjscontainer">
                        <div id="vjs-1" data-apireq="%7B%22c%22%3A%222256%22%2C%22e%22%3A%22sp-episode0%22%2C%22t%22%3A1788693678%2C%22p%22%3A5%2C%22s%22%3A%22aaee3d46281afa901f42011e73a5fbfc%22%7D" data-vid="sp0" data-tserver="pt1"></div>
                    </div>
                </div>
            </article>
            <nav class="navigation posts-navigation">
                <div class="nav-links">
                    <div class="nav-previous"><a href="https://anime1.me/category/2018%e5%b9%b4%e5%86%ac%e5%ad%a3/%e6%90%96%e6%9b%b3%e9%9c%b2%e7%87%9f%e2%96%b3/page/2">較舊的文章</a></div>
                </div>
            </nav>
        </main>
        </body>
        </html>
        "#;

        let page = Anime1Parser::parse_single_page(html).expect("Should parse single page");
        assert_eq!(page.title, "搖曳露營△");
        assert_eq!(page.articles.len(), 1);
        assert_eq!(
            page.next_page_url,
            Some("https://anime1.me/category/2018%e5%b9%b4%e5%86%ac%e5%ad%a3/%e6%90%96%e6%9b%b3%e9%9c%b2%e7%87%9f%e2%96%b3/page/2".to_string())
        );

        let (playlist, payloads) = Anime1Parser::assemble_playlist("https://anime1.me/category/2018年冬季/搖曳露營△/", &page.title, page.articles).expect("Should assemble");
        assert_eq!(playlist.episodes.len(), 1);
        assert_eq!(payloads.len(), 1);
        assert_eq!(playlist.episodes[0].title, "搖曳露營△ [BD特典SP]");
    }
}
