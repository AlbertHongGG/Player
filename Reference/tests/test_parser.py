from anime_verifier.parser import parse_anime_page


def test_parse_anime_page_with_sample_html():
    sample_html = """
    <!DOCTYPE html>
    <html>
    <body>
    <main id="main" class="site-main" role="main">
        <article id="post-4786" class="post-4786 post type-post status-publish format-standard hentry">
            <header class="entry-header">
                <h2 class="entry-title"><a href="https://anime1.me/4786" rel="bookmark">搖曳露營△ [BD特典SP]</a></h2>
                <div class="entry-meta">
                    <span class="posted-on">
                        <time class="entry-date published updated" datetime="2018-04-01T11:09:17+08:00">2018-04-01</time>
                    </span>
                </div>
            </header>
            <div class="entry-content">
                <p></p>
                <div class="vjscontainer">
                    <div id="vjs-s8obg" class="video-js" data-apireq="%7B%22c%22%3A%222256%22%2C%22e%22%3A%22sp-episode0%22%2C%22t%22%3A1788693678%2C%22p%22%3A5%2C%22s%22%3A%22aaee3d46281afa901f42011e73a5fbfc%22%7D">
                        <video data-apireq="%7B%22c%22%3A%222256%22%2C%22e%22%3A%22sp-episode0%22%2C%22t%22%3A1788693678%2C%22p%22%3A5%2C%22s%22%3A%22aaee3d46281afa901f42011e73a5fbfc%22%7D"></video>
                    </div>
                </div>
                <p></p>
            </div>
        </article>
        <article id="post-4711" class="post-4711 post type-post status-publish format-standard hentry">
            <header class="entry-header">
                <h2 class="entry-title"><a href="https://anime1.me/4711" rel="bookmark">搖曳露營△ [12]</a></h2>
                <div class="entry-meta">
                    <span class="posted-on">
                        <time class="entry-date published updated" datetime="2018-03-23T04:17:10+08:00">2018-03-23</time>
                    </span>
                </div>
            </header>
            <div class="entry-content">
                <p></p>
                <div class="vjscontainer">
                    <div id="vjs-12345" class="video-js" data-apireq="%7B%22c%22%3A%221941%22%2C%22e%22%3A%226b%22%2C%22t%22%3A1787233540%2C%22p%22%3A0%2C%22s%22%3A%22f02cd278f93df0d5c4c8916af92dddda%22%7D"></div>
                </div>
            </div>
        </article>
    </main>
    </body>
    </html>
    """

    articles = parse_anime_page(sample_html)
    assert len(articles) == 2

    # Verify first article
    art1 = articles[0]
    assert art1.post_id == "post-4786"
    assert art1.title == "搖曳露營△ [BD特典SP]"
    assert art1.article_url == "https://anime1.me/4786"
    assert art1.published_at is not None
    assert art1.published_at.year == 2018
    assert art1.published_at.month == 4
    assert art1.published_at.day == 1
    assert len(art1.players) == 1
    assert art1.players[0].payload.c == "2256"
    assert art1.players[0].payload.e == "sp-episode0"
    assert art1.players[0].payload.p == 5
    assert art1.players[0].payload.s == "aaee3d46281afa901f42011e73a5fbfc"

    # Verify second article
    art2 = articles[1]
    assert art2.post_id == "post-4711"
    assert art2.title == "搖曳露營△ [12]"
    assert art2.article_url == "https://anime1.me/4711"
    assert art2.published_at.day == 23
    assert len(art2.players) == 1
    assert art2.players[0].payload.c == "1941"
    assert art2.players[0].payload.e == "6b"
    assert art2.players[0].payload.s == "f02cd278f93df0d5c4c8916af92dddda"
