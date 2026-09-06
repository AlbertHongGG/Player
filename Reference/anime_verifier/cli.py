"""Command Line Interface for Anime1 Video Verification Tool.

Built with Typer and Rich for modern, expressive terminal output.
"""

from __future__ import annotations

import json
import sys
from typing import Optional
import typer
from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn
from rich.table import Table
from rich import box

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from anime_verifier.fetchers import get_fetcher

from anime_verifier.parser import parse_anime_page
from anime_verifier.service import AnimeVerificationService

app = typer.Typer(
    name="anime",
    help="Anime1.me video loading workflow verification CLI tool.",
    add_completion=False,
)

console = Console()


@app.command(name="verify")
def verify_command(
    url: str = typer.Argument(..., help="Anime1 category or episode URL"),
    fetcher: str = typer.Option("auto", "--fetcher", "-f", help="Fetcher strategy: auto, http, or browser"),
    limit: Optional[int] = typer.Option(None, "--limit", "-l", help="Limit number of articles to verify"),
    headless: bool = typer.Option(True, "--headless/--no-headless", help="Run browser in headless mode"),
    json_output: bool = typer.Option(False, "--json", "-j", help="Output results in JSON format"),
    verbose: bool = typer.Option(False, "--verbose", "-v", help="Display verbose diagnostic details"),
) -> None:
    """Extracts episode payloads, calls v.anime1.me/api, and validates video stream accessibility."""
    if not json_output:
        console.print(
            Panel.fit(
                f"[bold cyan]Anime1.me Video Workflow Verifier[/bold cyan]\n"
                f"[yellow]Target URL:[/yellow] {url}\n"
                f"[yellow]Fetcher Mode:[/yellow] [bold green]{fetcher}[/bold green] | "
                f"[yellow]Limit:[/yellow] {limit or 'All'}",
                box=box.ROUNDED,
            )
        )

    service = AnimeVerificationService()

    with Progress(
        SpinnerColumn(),
        TextColumn("[progress.description]{task.description}"),
        BarColumn(),
        TaskProgressColumn(),
        console=console,
        disable=json_output,
    ) as progress:
        fetch_task = progress.add_task("[cyan]Fetching and parsing webpage...", total=1)
        try:
            page_fetcher = get_fetcher(mode=fetcher, headless=headless)
            articles = service.fetch_articles(url, fetcher=page_fetcher)
        except Exception as exc:
            progress.stop()
            console.print(f"[bold red]Fetch / Parse failed:[/bold red] {exc}")
            raise typer.Exit(code=1)

        progress.update(fetch_task, advance=1, description="[green]Page parsed successfully.")

        if limit is not None and limit > 0:
            articles = articles[:limit]

        total_articles = len(articles)
        verify_task = progress.add_task("[cyan]Verifying episodes...", total=total_articles)

        reports = []
        for idx, art in enumerate(articles, start=1):
            progress.update(verify_task, description=f"[cyan]Verifying ({idx}/{total_articles}): {art.title[:30]}")
            rep = service.verify_article(art)
            reports.append(rep)
            progress.advance(verify_task)

    if json_output:
        dump_data = [rep.model_dump(mode="json") for rep in reports]
        console.print_json(json.dumps(dump_data, ensure_ascii=False, indent=2))
        return

    # Render Rich Table
    table = Table(
        title="[bold green]Anime1 Video Loading Verification Summary[/bold green]",
        box=box.HEAVY_EDGE,
        show_header=True,
        header_style="bold magenta",
    )

    table.add_column("Post ID", style="dim", width=11)
    table.add_column("Episode Title", style="bold cyan", min_width=20)
    table.add_column("Publish Date", style="yellow", width=12)
    table.add_column("c / e / p", style="magenta", width=14)
    table.add_column("Signature (MD5)", style="dim", width=14)
    table.add_column("Stream Source URL", style="blue")
    table.add_column("Status", justify="center", width=14)
    table.add_column("Latency", justify="right", width=9)

    success_count = 0
    fail_count = 0

    for rep in reports:
        art = rep.article
        pub_str = art.published_at.strftime("%Y-%m-%d") if art.published_at else "N/A"

        if not rep.player_reports:
            table.add_row(
                art.post_id,
                art.title,
                pub_str,
                "No Players",
                "-",
                "-",
                "[yellow]NO PLAYER[/yellow]",
                "-",
            )
            fail_count += 1
            continue

        for pr in rep.player_reports:
            cep = f"{pr.payload.c} / {pr.payload.e} / {pr.payload.p}"
            sig_short = pr.payload.s[:6] + "..." + pr.payload.s[-4:]

            src_url = pr.sources[0].src if pr.sources else "API Failed"
            if len(src_url) > 40:
                src_url_display = src_url[:20] + "..." + src_url[-18:]
            else:
                src_url_display = src_url

            if pr.stream_result and pr.stream_result.is_success:
                status_badge = f"[bold green]OK ({pr.stream_result.status_code})[/bold green]"
                lat_str = f"{pr.stream_result.latency_ms:.0f} ms"
                success_count += 1
            else:
                err = pr.stream_result.error_message if pr.stream_result else "No stream"
                status_badge = f"[bold red]FAIL[/bold red] ({err[:10]})"
                lat_str = "-"
                fail_count += 1

            table.add_row(
                art.post_id,
                art.title,
                pub_str,
                cep,
                sig_short,
                src_url_display,
                status_badge,
                lat_str,
            )

            if verbose:
                console.print(f"\n[bold underline cyan]Detail: {art.title} (Player #{pr.player_index})[/bold underline cyan]")
                console.print(f"  [yellow]Raw Payload:[/yellow] {pr.payload.model_dump_json()}")
                if pr.cookies:
                    console.print(f"  [yellow]Auth Cookies:[/yellow] {pr.cookies.to_cookie_header()}")
                if pr.stream_result:
                    console.print(f"  [yellow]Stream Status:[/yellow] HTTP {pr.stream_result.status_code} ({pr.stream_result.content_type})")
                    console.print(f"  [yellow]Content-Range:[/yellow] {pr.stream_result.content_range}")
                    console.print(f"  [yellow]Stream URL:[/yellow] {pr.stream_result.stream_url}")

    console.print(table)

    # Summary Panel
    console.print(
        Panel.fit(
            f"[bold]Total Articles Checked:[/bold] {len(reports)} | "
            f"[bold green]Streams Verified:[/bold green] {success_count} | "
            f"[bold red]Failed:[/bold red] {fail_count}",
            box=box.ROUNDED,
            border_style="green" if fail_count == 0 else "yellow",
        )
    )


@app.command(name="parse")
def parse_command(
    url: str = typer.Argument(..., help="Anime1 category or episode URL"),
    fetcher: str = typer.Option("auto", "--fetcher", "-f", help="Fetcher strategy: auto, http, or browser"),
    json_output: bool = typer.Option(False, "--json", "-j", help="Output results in JSON format"),
) -> None:
    """Parses webpage and displays articles with data-apireq payloads without calling API."""
    service = AnimeVerificationService()
    try:
        active_fetcher = get_fetcher(mode=fetcher)
        articles = service.fetch_articles(url, fetcher=active_fetcher)
    except Exception as exc:
        console.print(f"[bold red]Error parsing page:[/bold red] {exc}")
        raise typer.Exit(code=1)

    if json_output:
        dump_data = [art.model_dump(mode="json") for art in articles]
        console.print_json(json.dumps(dump_data, ensure_ascii=False, indent=2))
        return

    table = Table(
        title=f"[bold cyan]Parsed Articles from {url}[/bold cyan]",
        box=box.ROUNDED,
        show_header=True,
        header_style="bold blue",
    )
    table.add_column("Post ID", style="dim", width=12)
    table.add_column("Title", style="bold white", min_width=25)
    table.add_column("Published Date", style="yellow", width=14)
    table.add_column("Players Count", justify="center", width=14)
    table.add_column("First Decoded Payload", style="green")

    for art in articles:
        pub_str = art.published_at.strftime("%Y-%m-%d %H:%M") if art.published_at else "N/A"
        first_payload = art.players[0].payload.model_dump_json() if art.players else "N/A"
        table.add_row(
            art.post_id,
            art.title,
            pub_str,
            str(len(art.players)),
            first_payload,
        )

    console.print(table)


def main() -> None:
    """CLI Entry point."""
    app()


if __name__ == "__main__":
    main()
