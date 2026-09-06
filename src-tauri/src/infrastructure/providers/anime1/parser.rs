use scraper::{Html, Selector};
use serde::{Deserialize, Serialize};

use crate::domain::episode::{Episode, Playlist};
use crate::domain::errors::ProviderError;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Anime1Payload {
    pub c: String,
    pub e: String,
    pub t: i64,
    pub p: i32,
    pub s: String,
}

pub struct Anime1Parser;

impl Anime1Parser {
    pub fn parse_html(
        url: &str,
        html_content: &str,
    ) -> Result<(Playlist, Vec<(String, Anime1Payload)>), ProviderError> {
        let document = Html::parse_document(html_content);

        // 1. Extract Playlist Title (prioritize page-title over title tag)
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

        // 2. Select articles
        let article_sel = Selector::parse("article").map_err(|e| ProviderError::Parse(e.to_string()))?;
        let entry_title_sel = Selector::parse(
            "header.entry-header h2.entry-title a, header.entry-header h1.entry-title a, h2.entry-title, h1.entry-title",
        )
        .map_err(|e| ProviderError::Parse(e.to_string()))?;
        let date_sel = Selector::parse("time.entry-date, time[datetime]")
            .map_err(|e| ProviderError::Parse(e.to_string()))?;
        let apireq_sel = Selector::parse("[data-apireq]")
            .map_err(|e| ProviderError::Parse(e.to_string()))?;

        let mut episodes = Vec::new();
        let mut payloads = Vec::new();

        for article in document.select(&article_sel) {
            let article_id = article.value().attr("id").unwrap_or("unknown_article").to_string();

            // Title and article url
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

            // Date (prefer clean text representation, or sanitize ISO string to YYYY-MM-DD)
            let published_at = article
                .select(&date_sel)
                .next()
                .map(|el| {
                    let text = el.text().collect::<String>().trim().to_string();
                    if !text.is_empty() {
                        text
                    } else if let Some(dt) = el.value().attr("datetime") {
                        dt.split('T').next().unwrap_or(dt).trim().to_string()
                    } else {
                        String::new()
                    }
                })
                .filter(|s| !s.is_empty());

            // Players in this article
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

                    let ep_id = if player_index == 1 {
                        format!("{}_{}", article_id, payload.e)
                    } else {
                        format!("{}_{}_p{}", article_id, payload.e, player_index)
                    };

                    let final_title = if player_index > 1 {
                        format!("{} (Part {})", ep_title, player_index)
                    } else {
                        ep_title.clone()
                    };

                    payloads.push((ep_id.clone(), payload));

                    episodes.push(Episode {
                        id: ep_id,
                        title: final_title,
                        published_at: published_at.clone(),
                        article_url: article_url.clone(),
                        player_index,
                        provider_id: "anime1".to_string(),
                    });

                    player_index += 1;
                }
            }
        }

        // Anime1 lists articles in reverse chronological order (newest on top).
        // Reverse so that Episode 01 appears first in chronological order.
        episodes.reverse();

        Ok((
            Playlist {
                title: cleaned_title,
                url: url.to_string(),
                provider_id: "anime1".to_string(),
                episodes,
            },
            payloads,
        ))
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
                        <div id="vjs-s8obg" data-apireq="%7B%22c%22%3A%222256%22%2C%22e%22%3A%22sp-episode0%22%2C%22t%22%3A1788693678%2C%22p%22%3A5%2C%22s%22%3A%22aaee3d46281afa901f42011e73a5fbfc%22%7D"></div>
                    </div>
                </div>
            </article>
            <article id="post-4711">
                <header class="entry-header">
                    <h2 class="entry-title"><a href="https://anime1.me/4711">搖曳露營△ [12]</a></h2>
                    <time class="entry-date" datetime="2018-03-23T04:17:10+08:00">2018-03-23</time>
                </header>
                <div class="entry-content">
                    <div class="vjscontainer">
                        <div id="vjs-12345" data-apireq="%7B%22c%22%3A%221941%22%2C%22e%22%3A%226b%22%2C%22t%22%3A1787233540%2C%22p%22%3A0%2C%22s%22%3A%22f02cd278f93df0d5c4c8916af92dddda%22%7D"></div>
                    </div>
                </div>
            </article>
        </main>
        </body>
        </html>
        "#;

        let (playlist, payloads) =
            Anime1Parser::parse_html("https://anime1.me/category/sample", html).unwrap();
        assert_eq!(playlist.title, "搖曳露營△");
        assert_eq!(playlist.episodes.len(), 2);
        assert_eq!(payloads.len(), 2);

        // Episode 12 is first because of reverse chronological sort
        assert_eq!(playlist.episodes[0].title, "搖曳露營△ [12]");

        // BD特典SP is second
        assert_eq!(playlist.episodes[1].title, "搖曳露營△ [BD特典SP]");
    }
}
