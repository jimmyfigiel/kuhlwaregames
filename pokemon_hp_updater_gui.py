#!/usr/bin/env python3
"""
Pokemon HP Updater GUI

Purpose:
  Updates only the HP field in existing Pokemon card JSON files.
  It does not re-download card images and does not re-parse attacks, powers,
  weakness, resistance, retreat, prices, or metadata.

Designed for this project structure:
  src/games/pokemon-only-one/data/cards/base_set.json
  src/games/pokemon-only-one/data/cards/jungle.json
  src/games/pokemon-only-one/data/cards/fossil.json
  src/games/pokemon-only-one/data/cards/pokemon_card_database.json

Dependencies:
  pip install requests beautifulsoup4

Optional fallback if TCG Collector blocks requests:
  pip install playwright
  python -m playwright install chromium

Run GUI:
  python pokemon_hp_updater_gui.py

Run command line:
  python pokemon_hp_updater_gui.py --no-gui --project-root .
"""

from __future__ import annotations

import argparse
import json
import re
import threading
import time
from dataclasses import dataclass
from pathlib import Path
from queue import Queue, Empty
from typing import Callable, Iterable
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup, NavigableString, Tag

try:
    import tkinter as tk
    from tkinter import filedialog, messagebox, ttk
except Exception:  # pragma: no cover - command line mode can still work without tkinter
    tk = None
    filedialog = None
    messagebox = None
    ttk = None


BASE_URL = "https://www.tcgcollector.com"

DATA_DIR = Path("src") / "games" / "pokemon-only-one" / "data" / "cards"
COMBINED_JSON_NAME = "pokemon_card_database.json"

SETS = [
    {
        "slug": "base-set",
        "json_name": "base_set.json",
        "display_name": "Base Set",
    },
    {
        "slug": "jungle",
        "json_name": "jungle.json",
        "display_name": "Jungle",
    },
    {
        "slug": "fossil",
        "json_name": "fossil.json",
        "display_name": "Fossil",
    },
]


@dataclass
class HpUpdateResult:
    set_name: str
    json_path: Path
    total_cards: int
    updated_cards: int
    unchanged_cards: int
    skipped_cards: int
    errors: list[dict]


class PageFetcher:
    """
    Fetches pages with requests first.

    If TCG Collector blocks normal requests with HTTP 403, the fetcher switches
    to Playwright and loads pages like a browser.
    """

    def __init__(self, log: Callable[[str], None] | None = None):
        self.log = log or (lambda message: None)
        self.session = requests.Session()
        self.session.headers.update(
            {
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/124.0 Safari/537.36"
                ),
                "Accept": (
                    "text/html,application/xhtml+xml,application/xml;"
                    "q=0.9,image/avif,image/webp,*/*;q=0.8"
                ),
                "Accept-Language": "en-US,en;q=0.9",
                "Connection": "keep-alive",
                "Upgrade-Insecure-Requests": "1",
            }
        )

        self.playwright = None
        self.browser = None
        self.context = None
        self.page = None
        self.using_playwright = False

    def close(self) -> None:
        if self.context is not None:
            self.context.close()
            self.context = None
        if self.browser is not None:
            self.browser.close()
            self.browser = None
        if self.playwright is not None:
            self.playwright.stop()
            self.playwright = None

    def start_playwright(self) -> None:
        if self.playwright is not None:
            return

        self.log("Starting Playwright browser fallback...")

        try:
            from playwright.sync_api import sync_playwright
        except ImportError as exc:
            raise RuntimeError(
                "TCG Collector returned 403 Forbidden, so Playwright is required.\n"
                "Install it with:\n"
                "  pip install playwright\n"
                "  python -m playwright install chromium"
            ) from exc

        self.playwright = sync_playwright().start()
        self.browser = self.playwright.chromium.launch(headless=True)
        self.context = self.browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 900},
            locale="en-US",
        )
        self.page = self.context.new_page()
        self.using_playwright = True

    def get_html_with_requests(self, url: str) -> str:
        response = self.session.get(url, timeout=30)

        if response.status_code == 403:
            raise requests.exceptions.HTTPError(
                f"403 Forbidden for url: {url}",
                response=response,
            )

        response.raise_for_status()
        return response.text

    def get_html_with_playwright(self, url: str) -> str:
        self.start_playwright()

        response = self.page.goto(url, wait_until="domcontentloaded", timeout=60000)

        if response is not None and response.status >= 400:
            self.log(f"Browser received HTTP {response.status} for {url}")

        try:
            self.page.wait_for_load_state("networkidle", timeout=15000)
        except Exception:
            pass

        return self.page.content()

    def get_soup(self, url: str) -> BeautifulSoup:
        if self.using_playwright:
            html = self.get_html_with_playwright(url)
            return BeautifulSoup(html, "html.parser")

        try:
            html = self.get_html_with_requests(url)
            return BeautifulSoup(html, "html.parser")
        except requests.exceptions.HTTPError as exc:
            status = exc.response.status_code if exc.response is not None else None

            if status == 403:
                self.log("Requests was blocked with 403. Switching to Playwright.")
                html = self.get_html_with_playwright(url)
                return BeautifulSoup(html, "html.parser")

            raise


def clean_text(value: str | None) -> str:
    if value is None:
        return ""

    value = value.replace("\xa0", " ")
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def get_page_lines(soup: BeautifulSoup) -> list[str]:
    text = soup.get_text("\n")
    return [clean_text(line) for line in text.splitlines() if clean_text(line)]


def get_document_tokens(soup: BeautifulSoup) -> list[dict]:
    tokens: list[dict] = []

    def walk(node, current_href: str = "") -> None:
        if isinstance(node, NavigableString):
            text = clean_text(str(node))
            if text:
                tokens.append({"kind": "text", "value": text, "href": current_href})
            return

        if not isinstance(node, Tag):
            return

        href = current_href
        if node.name == "a" and node.get("href"):
            href = urljoin(BASE_URL, node.get("href"))

        if node.name == "img":
            alt = clean_text(node.get("alt", ""))
            title = clean_text(node.get("title", ""))
            value = alt or title
            if value:
                tokens.append(
                    {
                        "kind": "image",
                        "value": value,
                        "href": href,
                        "src": urljoin(BASE_URL, node.get("src", "")) if node.get("src") else "",
                    }
                )

        for child in node.children:
            walk(child, href)

    walk(soup.body or soup)
    return tokens


def find_hp_in_json_ld(soup: BeautifulSoup) -> int | None:
    """
    Some pages expose structured data. This function scans any JSON-LD text for HP-like fields.
    It is intentionally defensive because the exact schema may change.
    """
    for script in soup.find_all("script", type="application/ld+json"):
        raw = script.string or script.get_text(" ", strip=True)
        if not raw:
            continue

        patterns = [
            r'"hp"\s*:\s*"?(\d{1,3})"?',
            r'"HP"\s*:\s*"?(\d{1,3})"?',
            r'\bHP\s*(\d{1,3})\b',
            r'\b(\d{1,3})\s*HP\b',
        ]

        for pattern in patterns:
            match = re.search(pattern, raw, re.IGNORECASE)
            if match:
                return int(match.group(1))

    return None


def find_hp_in_meta(soup: BeautifulSoup) -> int | None:
    """Scan page title and meta tags for strings like 'HP 70' or '70 HP'."""
    candidates: list[str] = []

    if soup.title:
        candidates.append(clean_text(soup.title.get_text(" ", strip=True)))

    for tag in soup.find_all("meta"):
        for attr in ("content", "value"):
            text = clean_text(tag.get(attr, ""))
            if text:
                candidates.append(text)

    return find_hp_in_strings(candidates)


def find_hp_in_strings(strings: Iterable[str]) -> int | None:
    """
    Handles both common renderings:
      HP 70
      HP: 70
      70 HP
    """
    for text in strings:
        text = clean_text(text)

        if not text:
            continue

        patterns = [
            r"\bHP\s*[:\-]?\s*(\d{1,3})\b",
            r"\b(\d{1,3})\s*HP\b",
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                hp = int(match.group(1))
                if 10 <= hp <= 340:
                    return hp

    return None


def find_hp_from_adjacent_lines(lines: list[str]) -> int | None:
    """
    TCG Collector sometimes splits labels and values across separate DOM nodes/lines.
    This catches:
      HP
      70
    and:
      Hit Points
      70
    """
    labels = {"hp", "hit points", "hitpoints"}

    for index, line in enumerate(lines):
        normalized = clean_text(line).lower()

        if normalized not in labels:
            continue

        for lookahead in range(index + 1, min(index + 5, len(lines))):
            candidate = clean_text(lines[lookahead])
            match = re.fullmatch(r"(\d{1,3})", candidate)
            if match:
                hp = int(match.group(1))
                if 10 <= hp <= 340:
                    return hp

    return None


def find_hp_from_adjacent_tokens(tokens: list[dict]) -> int | None:
    labels = {"hp", "hit points", "hitpoints"}

    for index, token in enumerate(tokens):
        if token.get("kind") != "text":
            continue

        value = clean_text(token.get("value", "")).lower()

        if value not in labels:
            continue

        for lookahead in range(index + 1, min(index + 8, len(tokens))):
            candidate = clean_text(tokens[lookahead].get("value", ""))
            match = re.fullmatch(r"(\d{1,3})", candidate)
            if match:
                hp = int(match.group(1))
                if 10 <= hp <= 340:
                    return hp

    return None


def parse_hp_from_card_page(soup: BeautifulSoup) -> int | None:
    """
    Root-cause fix for the missing HP problem: HP can be split across different page
    nodes, so a single regex over each line is not enough. This tries several stable
    sources in order, from structured to broad text.
    """
    hp = find_hp_in_json_ld(soup)
    if hp is not None:
        return hp

    hp = find_hp_in_meta(soup)
    if hp is not None:
        return hp

    lines = get_page_lines(soup)

    hp = find_hp_in_strings(lines)
    if hp is not None:
        return hp

    hp = find_hp_from_adjacent_lines(lines)
    if hp is not None:
        return hp

    tokens = get_document_tokens(soup)

    hp = find_hp_from_adjacent_tokens(tokens)
    if hp is not None:
        return hp

    # Last-resort broad scan of visible page text.
    hp = find_hp_in_strings([soup.get_text(" ")])
    if hp is not None:
        return hp

    return None


def read_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as file:
        json.dump(data, file, indent=2, ensure_ascii=False)
        file.write("\n")


def is_pokemon_card(card: dict) -> bool:
    supertype = clean_text(card.get("supertype", "")).lower()
    return supertype in {"pokemon", "pokémon"}


def update_set_hp(
    *,
    project_root: Path,
    set_config: dict,
    fetcher: PageFetcher,
    delay_seconds: float,
    only_missing_hp: bool,
    log: Callable[[str], None],
) -> HpUpdateResult:
    json_path = project_root / DATA_DIR / set_config["json_name"]

    if not json_path.exists():
        raise FileNotFoundError(f"Missing JSON file: {json_path}")

    data = read_json(json_path)
    cards = data.get("cards", [])

    updated_cards = 0
    unchanged_cards = 0
    skipped_cards = 0
    errors: list[dict] = []

    log(f"\n=== {set_config['display_name']} ===")
    log(f"JSON: {json_path}")
    log(f"Cards found in JSON: {len(cards)}")

    for index, card in enumerate(cards, start=1):
        name = card.get("name", "Unknown")
        source_url = card.get("source_url", "")
        old_hp = card.get("hp")

        if not is_pokemon_card(card):
            skipped_cards += 1
            continue

        if only_missing_hp and old_hp not in {None, "", 0}:
            skipped_cards += 1
            continue

        if not source_url:
            skipped_cards += 1
            errors.append({"name": name, "error": "Missing source_url"})
            log(f"[{index}/{len(cards)}] SKIP {name}: missing source_url")
            continue

        try:
            log(f"[{index}/{len(cards)}] Fetching HP: {name}")
            soup = fetcher.get_soup(source_url)
            new_hp = parse_hp_from_card_page(soup)

            if new_hp is None:
                unchanged_cards += 1
                errors.append({"name": name, "source_url": source_url, "error": "Could not find HP"})
                log(f"  HP not found. Old HP: {old_hp}")
            elif old_hp != new_hp:
                card["hp"] = new_hp
                updated_cards += 1
                log(f"  HP updated: {old_hp} -> {new_hp}")
            else:
                unchanged_cards += 1
                log(f"  HP unchanged: {new_hp}")

            write_json(json_path, data)
            time.sleep(delay_seconds)

        except Exception as exc:
            unchanged_cards += 1
            error_message = str(exc)
            errors.append({"name": name, "source_url": source_url, "error": error_message})
            log(f"  ERROR: {error_message}")
            write_json(json_path, data)

    # Keep errors visible in the set file without destroying any existing errors from full scrape.
    hp_errors = data.get("hp_update_errors", [])
    hp_errors.extend(errors)
    data["hp_update_errors"] = hp_errors
    data["hp_update_last_run"] = {
        "updated_cards": updated_cards,
        "unchanged_cards": unchanged_cards,
        "skipped_cards": skipped_cards,
        "errors": len(errors),
    }
    write_json(json_path, data)

    return HpUpdateResult(
        set_name=set_config["display_name"],
        json_path=json_path,
        total_cards=len(cards),
        updated_cards=updated_cards,
        unchanged_cards=unchanged_cards,
        skipped_cards=skipped_cards,
        errors=errors,
    )


def rebuild_combined_database(project_root: Path, selected_sets: list[dict], log: Callable[[str], None]) -> None:
    combined_cards: list[dict] = []
    combined_errors: list[dict] = []
    sets_metadata: list[dict] = []

    for set_config in selected_sets:
        path = project_root / DATA_DIR / set_config["json_name"]
        if not path.exists():
            continue

        data = read_json(path)
        set_metadata = data.get("set", {})
        sets_metadata.append(set_metadata)

        for card in data.get("cards", []):
            combined_cards.append(card)

        for error in data.get("errors", []):
            combined_errors.append({**error, "set": set_config["display_name"]})

        for error in data.get("hp_update_errors", []):
            combined_errors.append({**error, "set": set_config["display_name"], "kind": "hp_update"})

    combined = {
        "sets": sets_metadata,
        "cards": combined_cards,
        "errors": combined_errors,
    }

    output_path = project_root / DATA_DIR / COMBINED_JSON_NAME
    write_json(output_path, combined)
    log(f"\nRebuilt combined database: {output_path}")
    log(f"Combined cards: {len(combined_cards)}")


def run_hp_update(
    *,
    project_root: Path,
    selected_set_slugs: set[str],
    delay_seconds: float = 1.0,
    only_missing_hp: bool = False,
    rebuild_combined: bool = True,
    log: Callable[[str], None] | None = None,
) -> list[HpUpdateResult]:
    log = log or print
    project_root = project_root.resolve()

    selected_sets = [set_config for set_config in SETS if set_config["slug"] in selected_set_slugs]

    if not selected_sets:
        raise ValueError("Select at least one set.")

    log(f"Project root: {project_root}")
    log(f"Data directory: {project_root / DATA_DIR}")
    log(f"Only missing HP: {only_missing_hp}")

    fetcher = PageFetcher(log=log)
    results: list[HpUpdateResult] = []

    try:
        for set_config in selected_sets:
            result = update_set_hp(
                project_root=project_root,
                set_config=set_config,
                fetcher=fetcher,
                delay_seconds=delay_seconds,
                only_missing_hp=only_missing_hp,
                log=log,
            )
            results.append(result)

        if rebuild_combined:
            rebuild_combined_database(project_root, selected_sets, log)

    finally:
        fetcher.close()

    log("\nDone.")
    for result in results:
        log(
            f"{result.set_name}: "
            f"updated={result.updated_cards}, "
            f"unchanged={result.unchanged_cards}, "
            f"skipped={result.skipped_cards}, "
            f"errors={len(result.errors)}"
        )

    return results


class HpUpdaterGui:
    def __init__(self, root):
        self.root = root
        self.root.title("Pokémon HP Updater")
        self.root.geometry("900x650")

        self.log_queue: Queue[str] = Queue()
        self.worker_thread: threading.Thread | None = None

        self.project_root_var = tk.StringVar(value=str(Path.cwd()))
        self.delay_var = tk.StringVar(value="1.0")
        self.only_missing_var = tk.BooleanVar(value=False)
        self.rebuild_combined_var = tk.BooleanVar(value=True)
        self.set_vars = {set_config["slug"]: tk.BooleanVar(value=True) for set_config in SETS}

        self.build_layout()
        self.root.after(100, self.drain_log_queue)

    def build_layout(self) -> None:
        outer = ttk.Frame(self.root, padding=12)
        outer.pack(fill="both", expand=True)

        title = ttk.Label(outer, text="Pokémon HP Updater", font=("Segoe UI", 16, "bold"))
        title.pack(anchor="w")

        description = ttk.Label(
            outer,
            text=(
                "Updates only the hp field in existing Base Set, Jungle, and Fossil JSON files. "
                "Images and other parsed data are left alone."
            ),
            wraplength=850,
        )
        description.pack(anchor="w", pady=(0, 12))

        project_frame = ttk.LabelFrame(outer, text="Project")
        project_frame.pack(fill="x", pady=(0, 10))

        project_entry = ttk.Entry(project_frame, textvariable=self.project_root_var)
        project_entry.pack(side="left", fill="x", expand=True, padx=8, pady=8)

        browse_button = ttk.Button(project_frame, text="Browse...", command=self.browse_project_root)
        browse_button.pack(side="left", padx=(0, 8), pady=8)

        options_frame = ttk.LabelFrame(outer, text="Options")
        options_frame.pack(fill="x", pady=(0, 10))

        sets_frame = ttk.Frame(options_frame)
        sets_frame.pack(fill="x", padx=8, pady=8)

        ttk.Label(sets_frame, text="Sets:").pack(side="left", padx=(0, 8))

        for set_config in SETS:
            ttk.Checkbutton(
                sets_frame,
                text=set_config["display_name"],
                variable=self.set_vars[set_config["slug"]],
            ).pack(side="left", padx=(0, 14))

        second_options = ttk.Frame(options_frame)
        second_options.pack(fill="x", padx=8, pady=(0, 8))

        ttk.Checkbutton(
            second_options,
            text="Only update cards with missing HP",
            variable=self.only_missing_var,
        ).pack(side="left", padx=(0, 16))

        ttk.Checkbutton(
            second_options,
            text="Rebuild combined pokemon_card_database.json",
            variable=self.rebuild_combined_var,
        ).pack(side="left", padx=(0, 16))

        ttk.Label(second_options, text="Delay seconds:").pack(side="left", padx=(0, 6))
        delay_entry = ttk.Entry(second_options, textvariable=self.delay_var, width=8)
        delay_entry.pack(side="left")

        button_frame = ttk.Frame(outer)
        button_frame.pack(fill="x", pady=(0, 10))

        self.run_button = ttk.Button(button_frame, text="Update HP", command=self.start_update)
        self.run_button.pack(side="left")

        clear_button = ttk.Button(button_frame, text="Clear Log", command=self.clear_log)
        clear_button.pack(side="left", padx=(8, 0))

        self.status_var = tk.StringVar(value="Ready")
        status_label = ttk.Label(button_frame, textvariable=self.status_var)
        status_label.pack(side="left", padx=(16, 0))

        log_frame = ttk.LabelFrame(outer, text="Log")
        log_frame.pack(fill="both", expand=True)

        self.log_text = tk.Text(log_frame, wrap="word", height=20)
        self.log_text.pack(side="left", fill="both", expand=True, padx=(8, 0), pady=8)

        scrollbar = ttk.Scrollbar(log_frame, orient="vertical", command=self.log_text.yview)
        scrollbar.pack(side="right", fill="y", padx=(0, 8), pady=8)
        self.log_text.configure(yscrollcommand=scrollbar.set)

    def browse_project_root(self) -> None:
        path = filedialog.askdirectory(initialdir=self.project_root_var.get() or str(Path.cwd()))
        if path:
            self.project_root_var.set(path)

    def log(self, message: str) -> None:
        self.log_queue.put(message)

    def drain_log_queue(self) -> None:
        try:
            while True:
                message = self.log_queue.get_nowait()
                self.log_text.insert("end", message + "\n")
                self.log_text.see("end")
        except Empty:
            pass

        self.root.after(100, self.drain_log_queue)

    def clear_log(self) -> None:
        self.log_text.delete("1.0", "end")

    def selected_set_slugs(self) -> set[str]:
        return {slug for slug, var in self.set_vars.items() if var.get()}

    def start_update(self) -> None:
        if self.worker_thread is not None and self.worker_thread.is_alive():
            messagebox.showinfo("Pokémon HP Updater", "An update is already running.")
            return

        try:
            delay_seconds = float(self.delay_var.get())
            if delay_seconds < 0:
                raise ValueError
        except ValueError:
            messagebox.showerror("Invalid delay", "Delay seconds must be a number 0 or greater.")
            return

        selected_sets = self.selected_set_slugs()
        if not selected_sets:
            messagebox.showerror("No sets selected", "Select at least one set.")
            return

        project_root = Path(self.project_root_var.get()).expanduser()
        if not project_root.exists():
            messagebox.showerror("Project not found", f"Project root does not exist:\n{project_root}")
            return

        self.run_button.configure(state="disabled")
        self.status_var.set("Running...")

        def worker() -> None:
            try:
                run_hp_update(
                    project_root=project_root,
                    selected_set_slugs=selected_sets,
                    delay_seconds=delay_seconds,
                    only_missing_hp=self.only_missing_var.get(),
                    rebuild_combined=self.rebuild_combined_var.get(),
                    log=self.log,
                )
                self.log("\nHP update finished successfully.")
            except Exception as exc:
                self.log(f"\nFAILED: {exc}")
            finally:
                self.root.after(0, lambda: self.run_button.configure(state="normal"))
                self.root.after(0, lambda: self.status_var.set("Ready"))

        self.worker_thread = threading.Thread(target=worker, daemon=True)
        self.worker_thread.start()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Update Pokémon card HP values in existing JSON files.")
    parser.add_argument("--no-gui", action="store_true", help="Run from the command line instead of opening the GUI.")
    parser.add_argument("--project-root", default=".", help="Project root folder. Defaults to current directory.")
    parser.add_argument(
        "--sets",
        default="base-set,jungle,fossil",
        help="Comma-separated set slugs. Options: base-set,jungle,fossil",
    )
    parser.add_argument("--delay", type=float, default=1.0, help="Delay between card page requests.")
    parser.add_argument("--only-missing", action="store_true", help="Only fetch HP for Pokémon cards with missing HP.")
    parser.add_argument(
        "--no-combined",
        action="store_true",
        help="Do not rebuild pokemon_card_database.json after updating set files.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    if args.no_gui:
        selected_set_slugs = {slug.strip() for slug in args.sets.split(",") if slug.strip()}
        run_hp_update(
            project_root=Path(args.project_root),
            selected_set_slugs=selected_set_slugs,
            delay_seconds=args.delay,
            only_missing_hp=args.only_missing,
            rebuild_combined=not args.no_combined,
            log=print,
        )
        return

    if tk is None:
        raise RuntimeError("tkinter is not available. Use --no-gui or install tkinter for your Python distribution.")

    root = tk.Tk()
    HpUpdaterGui(root)
    root.mainloop()


if __name__ == "__main__":
    main()
