#!/usr/bin/env python3
"""
Pokemon Card Data Repair GUI

Purpose:
  Updates selected data fields in existing Pokemon JSON files without
  re-downloading images or replacing your existing card IDs/image paths.

Designed for this project structure:
  src/games/pokemon-only-one/data/cards/base_set.json
  src/games/pokemon-only-one/data/cards/jungle.json
  src/games/pokemon-only-one/data/cards/fossil.json
  src/games/pokemon-only-one/data/cards/pokemon_card_database.json

What it can repair:
  - HP
  - Pokemon type
  - stage / evolves_from
  - powers
  - attacks, while removing fake header attacks like name='Pokemon'
  - weakness / resistance / retreat_cost
  - Energy provides
  - Trainer / Special Energy rules text
  - metadata cleanup, especially bogus pokedex_number values like 'More'

Dependencies:
  pip install requests beautifulsoup4

Optional fallback if TCG Collector blocks requests:
  pip install playwright
  python -m playwright install chromium

Run GUI:
  python pokemon_card_data_repair_gui.py

Run command line:
  python pokemon_card_data_repair_gui.py --no-gui --project-root .

Examples:
  python pokemon_card_data_repair_gui.py --no-gui --project-root . --only-missing
  python pokemon_card_data_repair_gui.py --no-gui --project-root . --fields hp,pokemon_type,stage,attacks
"""

from __future__ import annotations

import argparse
import json
import re
import threading
import time
from dataclasses import dataclass, field
from pathlib import Path
from queue import Empty, Queue
from typing import Callable, Iterable
from urllib.parse import parse_qs, urljoin, urlparse

import requests
from bs4 import BeautifulSoup, NavigableString, Tag

try:
    import tkinter as tk
    from tkinter import filedialog, messagebox, ttk
except Exception:  # pragma: no cover
    tk = None
    filedialog = None
    messagebox = None
    ttk = None

BASE_URL = "https://www.tcgcollector.com"

DATA_DIR = Path("src") / "games" / "pokemon-only-one" / "data" / "cards"
COMBINED_JSON_NAME = "pokemon_card_database.json"

SETS = [
    {"slug": "base-set", "json_name": "base_set.json", "display_name": "Base Set", "set_code": "BS"},
    {"slug": "jungle", "json_name": "jungle.json", "display_name": "Jungle", "set_code": "JU"},
    {"slug": "fossil", "json_name": "fossil.json", "display_name": "Fossil", "set_code": "FO"},
]

FIELD_OPTIONS = [
    ("hp", "HP"),
    ("pokemon_type", "Pokémon type"),
    ("stage", "Stage / evolves from"),
    ("powers", "Pokémon Powers"),
    ("attacks", "Attacks + remove fake attacks"),
    ("wrr", "Weakness / Resistance / Retreat"),
    ("energy_provides", "Energy provides"),
    ("rules_text", "Trainer / Special Energy rules text"),
    ("metadata_cleanup", "Metadata cleanup"),
]

DEFAULT_FIELDS = {key for key, _label in FIELD_OPTIONS}

ENERGY_TYPES = {
    "Grass",
    "Fire",
    "Water",
    "Lightning",
    "Psychic",
    "Fighting",
    "Darkness",
    "Metal",
    "Fairy",
    "Dragon",
    "Colorless",
}

POWER_LABELS = {
    "Pokémon Power",
    "Pokemon Power",
    "Poké-Power",
    "Poke-Power",
    "Poké-Body",
    "Poke-Body",
    "Ability",
    "Ancient Trait",
}

CARD_SECTION_LABELS = {
    "Weakness",
    "Resistance",
    "Retreat Cost",
    "Expansion",
    "Card number",
    "Provides",
    "Rarity",
    "Illustrators",
    "Illustrator",
    "Pokédex",
    "Pokedex",
    "Card format",
    "Market Price",
    "Cardmarket",
    "TCGplayer",
}

STAGE_VALUES = {"Basic", "Stage 1", "Stage 2", "Level-Up", "Restored"}


@dataclass
class RepairOptions:
    fields: set[str] = field(default_factory=lambda: set(DEFAULT_FIELDS))
    only_missing: bool = False
    delay_seconds: float = 1.0
    rebuild_combined: bool = True


@dataclass
class SetRepairResult:
    set_name: str
    json_path: Path
    total_cards: int
    changed_cards: int
    unchanged_cards: int
    skipped_cards: int
    errors: list[dict]


class PageFetcher:
    def __init__(self, log: Callable[[str], None] | None = None):
        self.log = log or (lambda _message: None)
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
            raise requests.exceptions.HTTPError(f"403 Forbidden for url: {url}", response=response)
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
            return BeautifulSoup(self.get_html_with_playwright(url), "html.parser")
        try:
            return BeautifulSoup(self.get_html_with_requests(url), "html.parser")
        except requests.exceptions.HTTPError as exc:
            status = exc.response.status_code if exc.response is not None else None
            if status == 403:
                self.log("Requests was blocked with 403. Switching to Playwright.")
                return BeautifulSoup(self.get_html_with_playwright(url), "html.parser")
            raise


def clean_text(value: str | None) -> str:
    if value is None:
        return ""
    value = value.replace("\xa0", " ")
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def read_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as file:
        json.dump(data, file, indent=2, ensure_ascii=False)
        file.write("\n")


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
            if value or node.get("src"):
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


def is_pokemon_card(card: dict) -> bool:
    return clean_text(card.get("supertype", "")).lower() in {"pokemon", "pokémon"}


def is_energy_card(card: dict) -> bool:
    supertype = clean_text(card.get("supertype", "")).lower()
    name = clean_text(card.get("name", ""))
    return "energy" in supertype or name.endswith(" Energy")


def is_trainer_or_special_energy(card: dict) -> bool:
    supertype = clean_text(card.get("supertype", ""))
    return supertype in {"Trainer", "Special Energy"}


def get_next_line_after_label(lines: list[str], label: str) -> str:
    for index, line in enumerate(lines):
        if line.lower() != label.lower():
            continue
        for lookahead in range(index + 1, len(lines)):
            candidate = clean_text(lines[lookahead])
            if candidate:
                return candidate
    return ""


def find_first_index(tokens: list[dict], value: str) -> int:
    for index, token in enumerate(tokens):
        if token.get("kind") == "text" and token.get("value") == value:
            return index
    return -1


def next_text_token(tokens: list[dict], start: int) -> tuple[int, str]:
    for index in range(start, len(tokens)):
        if tokens[index].get("kind") == "text":
            value = clean_text(tokens[index].get("value", ""))
            if value:
                return index, value
    return -1, ""


def is_energy_image_token(token: dict) -> bool:
    if token.get("kind") != "image":
        return False
    value = clean_text(token.get("value", ""))
    return value in ENERGY_TYPES


def remove_noise_tokens(tokens: list[dict]) -> list[dict]:
    """
    Drop most navigation/search text by starting near the first market price when present.
    If no price is found, keep all tokens because some pages omit price text.
    """
    for index, token in enumerate(tokens):
        value = clean_text(token.get("value", ""))
        if re.fullmatch(r"\$[\d,]+(?:\.\d+)?|\$—", value):
            return tokens[index:]
    return tokens


def find_hp_in_json_ld(soup: BeautifulSoup) -> int | None:
    for script in soup.find_all("script", type="application/ld+json"):
        raw = script.string or script.get_text(" ", strip=True)
        if not raw:
            continue
        for pattern in (r'"hp"\s*:\s*"?(\d{1,3})"?', r'"HP"\s*:\s*"?(\d{1,3})"?', r"\bHP\s*(\d{1,3})\b", r"\b(\d{1,3})\s*HP\b"):
            match = re.search(pattern, raw, re.IGNORECASE)
            if match:
                hp = int(match.group(1))
                if 10 <= hp <= 340:
                    return hp
    return None


def find_hp_in_meta(soup: BeautifulSoup) -> int | None:
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
    for text in strings:
        text = clean_text(text)
        if not text:
            continue
        for pattern in (r"\bHP\s*[:\-]?\s*(\d{1,3})\b", r"\b(\d{1,3})\s*HP\b"):
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                hp = int(match.group(1))
                if 10 <= hp <= 340:
                    return hp
    return None


def find_hp_from_adjacent_lines(lines: list[str]) -> int | None:
    labels = {"hp", "hit points", "hitpoints"}
    for index, line in enumerate(lines):
        if clean_text(line).lower() not in labels:
            continue
        for lookahead in range(index + 1, min(index + 5, len(lines))):
            match = re.fullmatch(r"(\d{1,3})", clean_text(lines[lookahead]))
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
        if clean_text(token.get("value", "")).lower() not in labels:
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
    for parser in (
        find_hp_in_json_ld,
        find_hp_in_meta,
        lambda s: find_hp_in_strings(get_page_lines(s)),
        lambda s: find_hp_from_adjacent_lines(get_page_lines(s)),
        lambda s: find_hp_from_adjacent_tokens(get_document_tokens(s)),
        lambda s: find_hp_in_strings([s.get_text(" ")]),
    ):
        hp = parser(soup)
        if hp is not None:
            return hp
    return None


def parse_stage_and_evolves_from(soup: BeautifulSoup, lines: list[str]) -> tuple[str, str]:
    all_text = "\n".join(lines)
    patterns = [
        r"\b(Stage\s+[12])\s*[–-]\s*Evolves\s+from\s+([^\n]+)",
        r"\b(Stage\s+[12])\b\s+Evolves\s+from\s+([^\n]+)",
        r"\b(Stage\s+[12])\b.*?Evolves\s+from\s+([A-Za-z0-9 .:'\-]+)",
    ]
    for pattern in patterns:
        match = re.search(pattern, all_text, re.IGNORECASE)
        if match:
            stage = clean_text(match.group(1)).title().replace("Stage 1", "Stage 1").replace("Stage 2", "Stage 2")
            evolves_from = clean_text(match.group(2))
            evolves_from = re.split(r"\s+(?:HP|Weakness|Resistance|Retreat|Expansion|Card number)\b", evolves_from)[0]
            return stage, evolves_from.strip(" –-")

    for line in lines:
        value = clean_text(line)
        if value in STAGE_VALUES:
            return value, ""
        if value.lower().startswith("basic"):
            return "Basic", ""

    # Token fallback: the header often appears as image(type), 'Pokémon', 'Stage 1 – Evolves from X'.
    tokens = remove_noise_tokens(get_document_tokens(soup))
    for index, token in enumerate(tokens):
        value = clean_text(token.get("value", ""))
        if value in STAGE_VALUES:
            return value, ""
        match = re.search(r"\b(Stage\s+[12])\s*[–-]\s*Evolves\s+from\s+(.+)$", value, re.IGNORECASE)
        if match:
            return clean_text(match.group(1)), clean_text(match.group(2))
        if value in {"Pokémon", "Pokemon"}:
            _next_index, next_value = next_text_token(tokens, index + 1)
            match = re.search(r"\b(Stage\s+[12])\s*[–-]\s*Evolves\s+from\s+(.+)$", next_value, re.IGNORECASE)
            if match:
                return clean_text(match.group(1)), clean_text(match.group(2))
            if next_value in STAGE_VALUES:
                return next_value, ""

    return "", ""


def parse_pokemon_type(soup: BeautifulSoup, lines: list[str]) -> str:
    tokens = remove_noise_tokens(get_document_tokens(soup))

    # Best signal: a type icon immediately before the 'Pokemon' header text.
    for index, token in enumerate(tokens):
        if token.get("kind") != "text":
            continue
        value = clean_text(token.get("value", ""))
        if value not in {"Pokémon", "Pokemon"}:
            continue
        for back in range(index - 1, max(-1, index - 8), -1):
            candidate = tokens[back]
            if is_energy_image_token(candidate):
                return clean_text(candidate.get("value", ""))

    # If the page has a textual line like 'Lightning Pokémon', use it.
    for line in lines:
        for energy_type in ENERGY_TYPES:
            if re.search(rf"\b{re.escape(energy_type)}\s+Pok[eé]mon\b", line, re.IGNORECASE):
                return energy_type

    return ""


def parse_powers_and_attacks(soup: BeautifulSoup) -> tuple[list[dict], list[dict]]:
    tokens = remove_noise_tokens(get_document_tokens(soup))
    weakness_idx = find_first_index(tokens, "Weakness")
    expansion_idx = find_first_index(tokens, "Expansion")
    stop_idx = len(tokens)
    if weakness_idx != -1:
        stop_idx = min(stop_idx, weakness_idx)
    if expansion_idx != -1:
        stop_idx = min(stop_idx, expansion_idx)

    powers: list[dict] = []
    attacks: list[dict] = []
    i = 0

    while i < stop_idx:
        token = tokens[i]
        value = clean_text(token.get("value", ""))

        if token.get("kind") == "text" and value in POWER_LABELS:
            power_kind = value
            name_index, power_name = next_text_token(tokens, i + 1)
            if name_index == -1:
                i += 1
                continue
            text_parts: list[str] = []
            j = name_index + 1
            while j < stop_idx:
                current = tokens[j]
                current_value = clean_text(current.get("value", ""))
                if current.get("kind") == "text" and current_value in POWER_LABELS:
                    break
                if is_energy_image_token(current):
                    break
                if current.get("kind") == "text" and current_value not in CARD_SECTION_LABELS:
                    # Avoid copying the card header into power text.
                    if current_value not in {"Pokémon", "Pokemon"} and current_value not in STAGE_VALUES:
                        text_parts.append(current_value)
                j += 1
            if power_name and power_name not in {"Pokémon", "Pokemon"}:
                powers.append(
                    {
                        "sort_order": len(powers) + 1,
                        "kind": power_kind,
                        "name": power_name,
                        "text": clean_text(" ".join(text_parts)),
                    }
                )
            i = j
            continue

        if is_energy_image_token(token):
            cost: list[str] = []
            while i < stop_idx and is_energy_image_token(tokens[i]):
                cost.append(clean_text(tokens[i].get("value", "")))
                i += 1

            name_index, attack_name = next_text_token(tokens, i)
            if name_index == -1:
                continue

            # Root-cause fix for fake attacks: the card header can look like
            # ENERGY_ICON, 'Pokemon', 'Basic' or 'Stage 1 - Evolves from X'.
            if attack_name in {"Pokémon", "Pokemon"}:
                i = name_index + 1
                continue
            if attack_name in STAGE_VALUES:
                i = name_index + 1
                continue
            if re.search(r"Evolves\s+from", attack_name, re.IGNORECASE):
                i = name_index + 1
                continue
            if attack_name in CARD_SECTION_LABELS:
                i = name_index + 1
                continue

            damage = ""
            text_parts: list[str] = []
            damage_index, possible_damage = next_text_token(tokens, name_index + 1)
            if damage_index != -1 and re.fullmatch(r"[\d+×xX\-]+", possible_damage):
                damage = possible_damage
                j = damage_index + 1
            else:
                j = name_index + 1

            while j < stop_idx:
                current = tokens[j]
                current_value = clean_text(current.get("value", ""))
                if is_energy_image_token(current):
                    break
                if current.get("kind") == "text" and current_value in POWER_LABELS:
                    break
                if current.get("kind") == "text" and current_value in CARD_SECTION_LABELS:
                    break
                if current.get("kind") == "text":
                    if current_value not in {"Pokémon", "Pokemon"} and current_value not in STAGE_VALUES:
                        text_parts.append(current_value)
                j += 1

            attacks.append(
                {
                    "sort_order": len(attacks) + 1,
                    "cost": cost,
                    "name": attack_name,
                    "damage": damage,
                    "text": clean_text(" ".join(text_parts)),
                }
            )
            i = j
            continue

        i += 1

    return powers, attacks


def infer_filter_type_from_href(href: str) -> str:
    if not href:
        return ""
    parsed = urlparse(href)
    query = parse_qs(parsed.query)
    for values in query.values():
        if not values:
            continue
        value = values[0]
        for energy_type in ENERGY_TYPES:
            if value.lower() == energy_type.lower():
                return energy_type
    return ""


def parse_weakness_resistance_retreat(soup: BeautifulSoup) -> tuple[list[dict], list[dict], list[str]]:
    tokens = remove_noise_tokens(get_document_tokens(soup))
    weakness: list[dict] = []
    resistance: list[dict] = []
    retreat_cost: list[str] = []

    def parse_labeled_value(label: str) -> tuple[str, str, str]:
        idx = find_first_index(tokens, label)
        if idx == -1:
            return "", "", ""
        found_type = ""
        found_value = ""
        found_href = ""
        for j in range(idx + 1, min(idx + 10, len(tokens))):
            token = tokens[j]
            if token.get("kind") == "image":
                candidate = clean_text(token.get("value", ""))
                if candidate in ENERGY_TYPES:
                    found_type = candidate
                    found_href = token.get("href", "")
            if token.get("kind") == "text":
                value = clean_text(token.get("value", ""))
                if value in CARD_SECTION_LABELS:
                    break
                if value and value != "—":
                    found_value = value
                    found_href = token.get("href", found_href)
                    break
        return found_type, found_value, found_href

    weakness_type, weakness_value, weakness_href = parse_labeled_value("Weakness")
    if weakness_value:
        weakness.append({"type": weakness_type or infer_filter_type_from_href(weakness_href), "value": weakness_value, "source_href": weakness_href})

    resistance_type, resistance_value, resistance_href = parse_labeled_value("Resistance")
    if resistance_value:
        resistance.append({"type": resistance_type or infer_filter_type_from_href(resistance_href), "value": resistance_value, "source_href": resistance_href})

    retreat_idx = find_first_index(tokens, "Retreat Cost")
    expansion_idx = find_first_index(tokens, "Expansion")
    if retreat_idx != -1:
        end_idx = expansion_idx if expansion_idx != -1 else min(retreat_idx + 12, len(tokens))
        retreat_hrefs: list[str] = []
        retreat_images: list[str] = []
        for token in tokens[retreat_idx + 1 : end_idx]:
            if token.get("kind") == "text" and clean_text(token.get("value", "")) in CARD_SECTION_LABELS:
                break
            if token.get("kind") == "image":
                value = clean_text(token.get("value", ""))
                if value in ENERGY_TYPES:
                    retreat_images.append(value)
                elif value == "":
                    retreat_images.append("Colorless")
            if token.get("href"):
                retreat_hrefs.append(token["href"])
        if retreat_images:
            retreat_cost = retreat_images
        else:
            for href in retreat_hrefs:
                parsed = urlparse(href)
                params = parse_qs(parsed.query)
                min_cost = params.get("retreatCostMin", [""])[0]
                max_cost = params.get("retreatCostMax", [""])[0]
                if min_cost and max_cost and min_cost == max_cost and min_cost.isdigit():
                    retreat_cost = ["Colorless"] * int(min_cost)
                    break

    return weakness, resistance, retreat_cost


def parse_rules_text(lines: list[str], supertype: str) -> str:
    if supertype not in {"Trainer", "Special Energy"}:
        return ""
    start_index = -1
    for i, line in enumerate(lines):
        if line == supertype:
            start_index = i + 1
            break
    if start_index == -1:
        return ""
    parts: list[str] = []
    for line in lines[start_index:]:
        if line in CARD_SECTION_LABELS:
            break
        if line not in {"0", "—"}:
            parts.append(line)
    return clean_text(" ".join(parts))


def infer_energy_provides(card: dict, lines: list[str]) -> list[str]:
    name = clean_text(card.get("name", ""))
    supertype = clean_text(card.get("supertype", ""))
    provides_line = get_next_line_after_label(lines, "Provides")

    if provides_line and provides_line not in {"—", "Rarity"}:
        values = []
        for energy_type in ENERGY_TYPES:
            if re.search(rf"\b{re.escape(energy_type)}\b", provides_line, re.IGNORECASE):
                values.append(energy_type)
        if values:
            return values

    if name == "Double Colorless Energy":
        return ["Colorless", "Colorless"]

    if name.endswith(" Energy"):
        possible = name.replace(" Energy", "").strip()
        if possible in ENERGY_TYPES:
            return [possible]

    if supertype == "Basic Energy":
        for energy_type in ENERGY_TYPES:
            if name.startswith(energy_type):
                return [energy_type]

    return []


def cleanup_metadata(card: dict, set_config: dict) -> bool:
    changed = False

    pokedex = clean_text(str(card.get("pokedex_number", "")))
    cleaned_pokedex = pokedex.replace("#", "").strip()
    if cleaned_pokedex and not re.fullmatch(r"\d+", cleaned_pokedex):
        cleaned_pokedex = ""
    if card.get("pokedex_number", "") != cleaned_pokedex:
        card["pokedex_number"] = cleaned_pokedex
        changed = True

    if not clean_text(card.get("set_slug", "")):
        card["set_slug"] = set_config["slug"]
        changed = True
    if not clean_text(card.get("set_name", "")):
        card["set_name"] = set_config["display_name"]
        changed = True

    # Do not overwrite a real set_code if the scraper found one, but fill obvious blanks.
    if not clean_text(card.get("set_code", "")):
        card["set_code"] = set_config.get("set_code", "")
        changed = True

    # Normalize Pokemon spelling for rule engine convenience.
    if clean_text(card.get("supertype", "")) == "Pokémon":
        card["supertype"] = "Pokemon"
        changed = True

    return changed


def is_blank_value(value) -> bool:
    """Return True for values that should not overwrite existing card data.

    This helper deliberately checks list/dict values before membership tests.
    Python lists and dicts are unhashable, so expressions like
    `value in {None, ""}` can crash when value is a list.
    """
    if value is None:
        return True
    if value == "":
        return True
    if isinstance(value, (list, tuple, set, dict)) and len(value) == 0:
        return True
    return False


def should_update_field(card: dict, field_name: str, new_value, only_missing: bool) -> bool:
    if is_blank_value(new_value):
        return False

    if not only_missing:
        return True

    old_value = card.get(field_name)
    return old_value == 0 or is_blank_value(old_value)


def apply_card_repairs(card: dict, soup: BeautifulSoup, set_config: dict, options: RepairOptions) -> tuple[bool, list[str]]:
    changed = False
    notes: list[str] = []
    fields = options.fields
    lines = get_page_lines(soup)
    supertype = clean_text(card.get("supertype", ""))

    if "metadata_cleanup" in fields:
        if cleanup_metadata(card, set_config):
            changed = True
            notes.append("metadata")

    if is_pokemon_card(card):
        if "hp" in fields:
            new_hp = parse_hp_from_card_page(soup)
            if should_update_field(card, "hp", new_hp, options.only_missing) and card.get("hp") != new_hp:
                card["hp"] = new_hp
                changed = True
                notes.append(f"hp={new_hp}")

        if "pokemon_type" in fields:
            pokemon_type = parse_pokemon_type(soup, lines)
            if should_update_field(card, "pokemon_type", pokemon_type, options.only_missing) and card.get("pokemon_type") != pokemon_type:
                card["pokemon_type"] = pokemon_type
                changed = True
                notes.append(f"type={pokemon_type}")

        if "stage" in fields:
            stage, evolves_from = parse_stage_and_evolves_from(soup, lines)
            if stage:
                subtypes = [stage]
                if should_update_field(card, "subtypes", subtypes, options.only_missing) and card.get("subtypes") != subtypes:
                    card["subtypes"] = subtypes
                    changed = True
                    notes.append(f"stage={stage}")
            if evolves_from:
                if should_update_field(card, "evolves_from", evolves_from, options.only_missing) and card.get("evolves_from") != evolves_from:
                    card["evolves_from"] = evolves_from
                    changed = True
                    notes.append(f"evolves_from={evolves_from}")

        if "powers" in fields or "attacks" in fields:
            powers, attacks = parse_powers_and_attacks(soup)
            if "powers" in fields:
                if should_update_field(card, "powers", powers, options.only_missing) and card.get("powers") != powers:
                    card["powers"] = powers
                    changed = True
                    notes.append(f"powers={len(powers)}")
            if "attacks" in fields:
                if should_update_field(card, "attacks", attacks, options.only_missing) and card.get("attacks") != attacks:
                    card["attacks"] = attacks
                    changed = True
                    notes.append(f"attacks={len(attacks)}")

        if "wrr" in fields:
            weakness, resistance, retreat_cost = parse_weakness_resistance_retreat(soup)
            if should_update_field(card, "weakness", weakness, options.only_missing) and card.get("weakness") != weakness:
                card["weakness"] = weakness
                changed = True
                notes.append("weakness")
            if should_update_field(card, "resistance", resistance, options.only_missing) and card.get("resistance") != resistance:
                card["resistance"] = resistance
                changed = True
                notes.append("resistance")
            # Empty retreat can be valid, so in non-only-missing mode allow replacing with [] too.
            if (not options.only_missing or retreat_cost) and card.get("retreat_cost") != retreat_cost:
                card["retreat_cost"] = retreat_cost
                changed = True
                notes.append(f"retreat={len(retreat_cost)}")

    if is_energy_card(card) and "energy_provides" in fields:
        provides = infer_energy_provides(card, lines)
        if should_update_field(card, "provides", provides, options.only_missing) and card.get("provides") != provides:
            card["provides"] = provides
            changed = True
            notes.append(f"provides={provides}")

    if is_trainer_or_special_energy(card) and "rules_text" in fields:
        rules_text = parse_rules_text(lines, supertype)
        if should_update_field(card, "rules_text", rules_text, options.only_missing) and card.get("rules_text") != rules_text:
            card["rules_text"] = rules_text
            changed = True
            notes.append("rules_text")

    return changed, notes


def repair_set_file(
    *,
    project_root: Path,
    set_config: dict,
    fetcher: PageFetcher,
    options: RepairOptions,
    log: Callable[[str], None],
) -> SetRepairResult:
    json_path = project_root / DATA_DIR / set_config["json_name"]
    if not json_path.exists():
        raise FileNotFoundError(f"Missing JSON file: {json_path}")

    data = read_json(json_path)
    cards = data.get("cards", [])
    changed_cards = 0
    unchanged_cards = 0
    skipped_cards = 0
    errors: list[dict] = []

    log(f"\n=== {set_config['display_name']} ===")
    log(f"JSON: {json_path}")
    log(f"Cards found in JSON: {len(cards)}")

    for index, card in enumerate(cards, start=1):
        name = clean_text(card.get("name", "Unknown")) or "Unknown"
        source_url = clean_text(card.get("source_url", ""))

        if not source_url:
            skipped_cards += 1
            errors.append({"name": name, "error": "Missing source_url"})
            log(f"[{index}/{len(cards)}] SKIP {name}: missing source_url")
            continue

        try:
            log(f"[{index}/{len(cards)}] Repairing: {name}")
            soup = fetcher.get_soup(source_url)
            changed, notes = apply_card_repairs(card, soup, set_config, options)
            if changed:
                changed_cards += 1
                log("  Updated: " + ", ".join(notes))
            else:
                unchanged_cards += 1
                log("  No changes")
            write_json(json_path, data)
            time.sleep(options.delay_seconds)
        except Exception as exc:
            unchanged_cards += 1
            error_message = str(exc)
            errors.append({"name": name, "source_url": source_url, "error": error_message})
            log(f"  ERROR: {error_message}")
            write_json(json_path, data)

    repair_errors = data.get("data_repair_errors", [])
    repair_errors.extend(errors)
    data["data_repair_errors"] = repair_errors
    data["data_repair_last_run"] = {
        "fields": sorted(options.fields),
        "changed_cards": changed_cards,
        "unchanged_cards": unchanged_cards,
        "skipped_cards": skipped_cards,
        "errors": len(errors),
    }
    write_json(json_path, data)

    return SetRepairResult(
        set_name=set_config["display_name"],
        json_path=json_path,
        total_cards=len(cards),
        changed_cards=changed_cards,
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
        if set_metadata:
            sets_metadata.append(set_metadata)
        for card in data.get("cards", []):
            combined_cards.append(card)
        for key in ("errors", "hp_update_errors", "data_repair_errors"):
            for error in data.get(key, []):
                combined_errors.append({**error, "set": set_config["display_name"], "kind": key})

    combined = {"sets": sets_metadata, "cards": combined_cards, "errors": combined_errors}
    output_path = project_root / DATA_DIR / COMBINED_JSON_NAME
    write_json(output_path, combined)
    log(f"\nRebuilt combined database: {output_path}")
    log(f"Combined cards: {len(combined_cards)}")


def run_data_repair(
    *,
    project_root: Path,
    selected_set_slugs: set[str],
    options: RepairOptions,
    log: Callable[[str], None] | None = None,
) -> list[SetRepairResult]:
    log = log or print
    project_root = project_root.resolve()
    selected_sets = [set_config for set_config in SETS if set_config["slug"] in selected_set_slugs]
    if not selected_sets:
        raise ValueError("Select at least one set.")
    if not options.fields:
        raise ValueError("Select at least one field to repair.")

    log(f"Project root: {project_root}")
    log(f"Data directory: {project_root / DATA_DIR}")
    log(f"Fields: {', '.join(sorted(options.fields))}")
    log(f"Only missing: {options.only_missing}")

    fetcher = PageFetcher(log=log)
    results: list[SetRepairResult] = []
    try:
        for set_config in selected_sets:
            result = repair_set_file(
                project_root=project_root,
                set_config=set_config,
                fetcher=fetcher,
                options=options,
                log=log,
            )
            results.append(result)
        if options.rebuild_combined:
            rebuild_combined_database(project_root, selected_sets, log)
    finally:
        fetcher.close()

    log("\nDone.")
    for result in results:
        log(
            f"{result.set_name}: changed={result.changed_cards}, "
            f"unchanged={result.unchanged_cards}, skipped={result.skipped_cards}, "
            f"errors={len(result.errors)}"
        )
    return results


class DataRepairGui:
    def __init__(self, root):
        self.root = root
        self.root.title("Pokémon Card Data Repair")
        self.root.geometry("980x760")

        self.log_queue: Queue[str] = Queue()
        self.worker_thread: threading.Thread | None = None

        self.project_root_var = tk.StringVar(value=str(Path.cwd()))
        self.delay_var = tk.StringVar(value="1.0")
        self.only_missing_var = tk.BooleanVar(value=False)
        self.rebuild_combined_var = tk.BooleanVar(value=True)
        self.set_vars = {set_config["slug"]: tk.BooleanVar(value=True) for set_config in SETS}
        self.field_vars = {key: tk.BooleanVar(value=True) for key, _label in FIELD_OPTIONS}

        self.build_layout()
        self.root.after(100, self.drain_log_queue)

    def build_layout(self) -> None:
        outer = ttk.Frame(self.root, padding=12)
        outer.pack(fill="both", expand=True)

        title = ttk.Label(outer, text="Pokémon Card Data Repair", font=("Segoe UI", 16, "bold"))
        title.pack(anchor="w")

        description = ttk.Label(
            outer,
            text=(
                "Repairs selected fields in existing Base Set, Jungle, and Fossil JSON files. "
                "It keeps existing IDs, image paths, downloaded images, and source URLs."
            ),
            wraplength=920,
        )
        description.pack(anchor="w", pady=(0, 12))

        project_frame = ttk.LabelFrame(outer, text="Project")
        project_frame.pack(fill="x", pady=(0, 10))
        project_entry = ttk.Entry(project_frame, textvariable=self.project_root_var)
        project_entry.pack(side="left", fill="x", expand=True, padx=8, pady=8)
        ttk.Button(project_frame, text="Browse...", command=self.browse_project_root).pack(side="left", padx=(0, 8), pady=8)

        sets_frame = ttk.LabelFrame(outer, text="Sets")
        sets_frame.pack(fill="x", pady=(0, 10))
        for set_config in SETS:
            ttk.Checkbutton(
                sets_frame,
                text=set_config["display_name"],
                variable=self.set_vars[set_config["slug"]],
            ).pack(side="left", padx=8, pady=8)

        fields_frame = ttk.LabelFrame(outer, text="Fields to repair")
        fields_frame.pack(fill="x", pady=(0, 10))
        for idx, (key, label) in enumerate(FIELD_OPTIONS):
            row = idx // 3
            col = idx % 3
            cb = ttk.Checkbutton(fields_frame, text=label, variable=self.field_vars[key])
            cb.grid(row=row, column=col, sticky="w", padx=8, pady=5)
        for col in range(3):
            fields_frame.grid_columnconfigure(col, weight=1)

        options_frame = ttk.LabelFrame(outer, text="Options")
        options_frame.pack(fill="x", pady=(0, 10))
        ttk.Checkbutton(options_frame, text="Only update missing/blank fields", variable=self.only_missing_var).pack(side="left", padx=8, pady=8)
        ttk.Checkbutton(options_frame, text="Rebuild combined pokemon_card_database.json", variable=self.rebuild_combined_var).pack(side="left", padx=8, pady=8)
        ttk.Label(options_frame, text="Delay seconds:").pack(side="left", padx=(16, 6))
        ttk.Entry(options_frame, textvariable=self.delay_var, width=8).pack(side="left", padx=(0, 8))

        button_frame = ttk.Frame(outer)
        button_frame.pack(fill="x", pady=(0, 10))
        self.run_button = ttk.Button(button_frame, text="Repair Selected Data", command=self.start_update)
        self.run_button.pack(side="left")
        ttk.Button(button_frame, text="Clear Log", command=self.clear_log).pack(side="left", padx=(8, 0))
        self.status_var = tk.StringVar(value="Ready")
        ttk.Label(button_frame, textvariable=self.status_var).pack(side="left", padx=(16, 0))

        log_frame = ttk.LabelFrame(outer, text="Log")
        log_frame.pack(fill="both", expand=True)
        self.log_text = tk.Text(log_frame, wrap="word", height=22)
        self.log_text.pack(side="left", fill="both", expand=True, padx=(8, 0), pady=8)
        scrollbar = ttk.Scrollbar(log_frame, orient="vertical", command=self.log_text.yview)
        scrollbar.pack(side="right", fill="y", padx=(0, 8), pady=8)
        self.log_text.configure(yscrollcommand=scrollbar.set)

    def browse_project_root(self) -> None:
        path = filedialog.askdirectory(initialdir=self.project_root_var.get() or str(Path.cwd()))
        if path:
            self.project_root_var.set(path)

    def selected_set_slugs(self) -> set[str]:
        return {slug for slug, var in self.set_vars.items() if var.get()}

    def selected_fields(self) -> set[str]:
        return {key for key, var in self.field_vars.items() if var.get()}

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

    def start_update(self) -> None:
        if self.worker_thread is not None and self.worker_thread.is_alive():
            messagebox.showinfo("Pokémon Card Data Repair", "A repair is already running.")
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
        selected_fields = self.selected_fields()
        if not selected_fields:
            messagebox.showerror("No fields selected", "Select at least one field to repair.")
            return
        project_root = Path(self.project_root_var.get()).expanduser()
        if not project_root.exists():
            messagebox.showerror("Project not found", f"Project root does not exist:\n{project_root}")
            return

        options = RepairOptions(
            fields=selected_fields,
            only_missing=self.only_missing_var.get(),
            delay_seconds=delay_seconds,
            rebuild_combined=self.rebuild_combined_var.get(),
        )

        self.run_button.configure(state="disabled")
        self.status_var.set("Running...")

        def worker() -> None:
            try:
                run_data_repair(
                    project_root=project_root,
                    selected_set_slugs=selected_sets,
                    options=options,
                    log=self.log,
                )
                self.log("\nData repair finished successfully.")
            except Exception as exc:
                self.log(f"\nFAILED: {exc}")
            finally:
                self.root.after(0, lambda: self.run_button.configure(state="normal"))
                self.root.after(0, lambda: self.status_var.set("Ready"))

        self.worker_thread = threading.Thread(target=worker, daemon=True)
        self.worker_thread.start()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Repair Pokémon card data fields in existing JSON files.")
    parser.add_argument("--no-gui", action="store_true", help="Run from command line instead of opening the GUI.")
    parser.add_argument("--project-root", default=".", help="Project root folder. Defaults to current directory.")
    parser.add_argument("--sets", default="base-set,jungle,fossil", help="Comma-separated set slugs: base-set,jungle,fossil")
    parser.add_argument(
        "--fields",
        default=",".join(sorted(DEFAULT_FIELDS)),
        help="Comma-separated fields: " + ",".join(key for key, _label in FIELD_OPTIONS),
    )
    parser.add_argument("--delay", type=float, default=1.0, help="Delay between card page requests.")
    parser.add_argument("--only-missing", action="store_true", help="Only update fields that are missing/blank.")
    parser.add_argument("--no-combined", action="store_true", help="Do not rebuild pokemon_card_database.json.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.no_gui:
        selected_set_slugs = {slug.strip() for slug in args.sets.split(",") if slug.strip()}
        selected_fields = {field.strip() for field in args.fields.split(",") if field.strip()}
        valid_fields = {key for key, _label in FIELD_OPTIONS}
        unknown_fields = selected_fields - valid_fields
        if unknown_fields:
            raise ValueError(f"Unknown fields: {', '.join(sorted(unknown_fields))}")
        run_data_repair(
            project_root=Path(args.project_root),
            selected_set_slugs=selected_set_slugs,
            options=RepairOptions(
                fields=selected_fields,
                only_missing=args.only_missing,
                delay_seconds=args.delay,
                rebuild_combined=not args.no_combined,
            ),
            log=print,
        )
        return

    if tk is None:
        raise RuntimeError("tkinter is not available. Use --no-gui or install tkinter for your Python distribution.")
    root = tk.Tk()
    DataRepairGui(root)
    root.mainloop()


if __name__ == "__main__":
    main()
