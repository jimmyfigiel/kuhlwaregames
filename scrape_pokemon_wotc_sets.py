import json
import re
import time
import hashlib
from pathlib import Path
from urllib.parse import urljoin, urlparse, parse_qs

import requests
from bs4 import BeautifulSoup, NavigableString, Tag


# Scrapes the WotC-era Pokémon TCG sets we are using for the game:
#   Base Set, Jungle, Fossil
#
# Default project output:
#   src/games/pokemon-only-one/data/cards/base_set.json
#   src/games/pokemon-only-one/data/cards/jungle.json
#   src/games/pokemon-only-one/data/cards/fossil.json
#   src/games/pokemon-only-one/data/cards/pokemon_card_database.json
#
#   public/card-images/pokemon/base-set/001-alakazam.jpg
#   public/card-images/pokemon/jungle/001-clefable.jpg
#   public/card-images/pokemon/fossil/001-aerodactyl.jpg
#
# Dependencies:
#   pip install requests beautifulsoup4
# Optional fallback if TCG Collector blocks requests:
#   pip install playwright
#   python -m playwright install chromium

BASE_URL = "https://www.tcgcollector.com"

SETS = [
    {
        "slug": "base-set",
        "json_name": "base_set.json",
        "display_name": "Base Set",
        "url": "https://www.tcgcollector.com/sets/111/base-set?setCardCountMode=anyCardVariant&releaseDateOrder=newToOld&displayAs=images",
    },
    {
        "slug": "jungle",
        "json_name": "jungle.json",
        "display_name": "Jungle",
        "url": "https://www.tcgcollector.com/sets/112/jungle?setCardCountMode=anyCardVariant&releaseDateOrder=newToOld&displayAs=images",
    },
    {
        "slug": "fossil",
        "json_name": "fossil.json",
        "display_name": "Fossil",
        "url": "https://www.tcgcollector.com/sets/113/fossil?setCardCountMode=anyCardVariant&releaseDateOrder=newToOld&displayAs=images",
    },
]

# Change these if your project structure changes.
DATA_DIR = Path("src") / "games" / "pokemon-only-one" / "data" / "cards"
IMAGE_ROOT_DIR = Path("public") / "card-images" / "pokemon"
PUBLIC_IMAGE_ROOT_PATH = "/card-images/pokemon"

COMBINED_JSON_OUTPUT = DATA_DIR / "pokemon_card_database.json"
REQUEST_DELAY_SECONDS = 1.0

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
}


class PageFetcher:
    """
    Tries normal requests first.

    If TCG Collector returns 403 Forbidden, this falls back to Playwright,
    which loads the page like a real browser.
    """

    def __init__(self):
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

    def close(self):
        if self.context is not None:
            self.context.close()
        if self.browser is not None:
            self.browser.close()
        if self.playwright is not None:
            self.playwright.stop()

    def start_playwright(self):
        if self.playwright is not None:
            return

        print("Starting Playwright browser fallback...")

        try:
            from playwright.sync_api import sync_playwright
        except ImportError as exc:
            raise RuntimeError(
                "Playwright is required because the site returned 403 Forbidden.\n"
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
            print(f"Browser received HTTP {response.status} for {url}")

        try:
            self.page.wait_for_load_state("networkidle", timeout=15000)
        except Exception:
            pass

        return self.page.content()

    def get_soup(self, url: str) -> BeautifulSoup:
        print(f"Loading: {url}")

        if self.using_playwright:
            html = self.get_html_with_playwright(url)
            return BeautifulSoup(html, "html.parser")

        try:
            html = self.get_html_with_requests(url)
            return BeautifulSoup(html, "html.parser")

        except requests.exceptions.HTTPError as exc:
            status = exc.response.status_code if exc.response is not None else None

            if status == 403:
                print("Requests was blocked with 403. Switching to Playwright.")
                html = self.get_html_with_playwright(url)
                return BeautifulSoup(html, "html.parser")

            raise


def clean_text(value: str) -> str:
    if value is None:
        return ""

    value = value.replace("\xa0", " ")
    value = re.sub(r"\s+", " ", value)
    return value.strip()


def money_to_number(raw: str):
    if not raw:
        return None

    raw = raw.strip()

    if raw in {"$—", "—", "-"}:
        return None

    match = re.search(r"\$([\d,]+(?:\.\d+)?)", raw)

    if not match:
        return None

    return float(match.group(1).replace(",", ""))


def slugify(value: str) -> str:
    value = value.lower()
    value = value.replace("♀", "-f").replace("♂", "-m")
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = value.strip("-")
    return value or "card"


def make_card_id(set_slug: str, collector_number, name: str) -> str:
    if collector_number is None:
        number_part = "unknown"
    else:
        number_part = f"{int(collector_number):03d}"

    return f"{set_slug}-{number_part}-{slugify(name)}"


def get_page_lines(soup: BeautifulSoup):
    text = soup.get_text("\n")
    return [clean_text(line) for line in text.splitlines() if clean_text(line)]


def get_next_line_after_label(lines, label):
    for i, line in enumerate(lines):
        if line.lower() == label.lower():
            for j in range(i + 1, len(lines)):
                candidate = clean_text(lines[j])
                if candidate:
                    return candidate

    return ""


def parse_card_count(lines):
    for line in lines:
        match = re.search(r"(\d+)\s*/\s*(\d+)", line)
        if match:
            return int(match.group(2))

    return None


def parse_release_date(lines):
    for line in lines:
        match = re.search(r"Released on (.+)", line)
        if match:
            return clean_text(match.group(1))

    return ""


def parse_set_page(fetcher: PageFetcher, set_config):
    set_url = set_config["url"]
    soup = fetcher.get_soup(set_url)
    lines = get_page_lines(soup)

    set_name = soup.find("h1").get_text(strip=True) if soup.find("h1") else set_config["display_name"]

    set_code = ""

    if set_name in lines:
        idx = lines.index(set_name)

        if idx + 1 < len(lines):
            set_code = lines[idx + 1]

    release_date = parse_release_date(lines)
    card_count = parse_card_count(lines)

    card_links = []
    seen = set()

    for a in soup.find_all("a", href=True):
        href = a["href"]
        text = clean_text(a.get_text(" ", strip=True))

        if "/cards/" not in href:
            continue

        if not re.fullmatch(r"\d+\s*/\s*\d+", text):
            continue

        full_url = urljoin(BASE_URL, href)

        if full_url in seen:
            continue

        seen.add(full_url)

        collector_number = int(text.split("/")[0])

        card_links.append(
            {
                "collector_number": collector_number,
                "card_number": text,
                "source_url": full_url,
            }
        )

    card_links.sort(key=lambda item: item["collector_number"])

    return {
        "set": {
            "name": set_name,
            "slug": set_config["slug"],
            "code": set_code,
            "release_date_raw": release_date,
            "card_count": card_count,
            "source_url": set_url,
        },
        "card_links": card_links,
    }


def image_url_from_card_page(soup: BeautifulSoup):
    image_extensions = (".jpg", ".jpeg", ".png", ".webp")

    for a in soup.find_all("a", href=True):
        href = a["href"]
        lower = href.lower()

        if "static.tcgcollector.com" in lower and lower.endswith(image_extensions):
            return urljoin(BASE_URL, href)

    for img in soup.find_all("img", src=True):
        src = img["src"]
        lower = src.lower()

        if "static.tcgcollector.com" in lower and lower.endswith(image_extensions):
            return urljoin(BASE_URL, src)

    return ""


def get_document_tokens(soup: BeautifulSoup):
    tokens = []

    def walk(node, current_href=""):
        if isinstance(node, NavigableString):
            text = clean_text(str(node))

            if text:
                tokens.append(
                    {
                        "kind": "text",
                        "value": text,
                        "href": current_href,
                    }
                )

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

    body = soup.body or soup
    walk(body)

    return tokens


def find_name(soup: BeautifulSoup, lines):
    h1 = soup.find("h1")

    if h1:
        text = clean_text(h1.get_text(" ", strip=True))
        text = text.lstrip("#").strip()

        if text:
            return text

    title = soup.find("title")

    if title:
        title_text = clean_text(title.get_text(" ", strip=True))
        title_text = re.sub(r"\s*\([^)]*\)\s*$", "", title_text)
        title_text = re.sub(r"\s*–\s*TCG Collector.*$", "", title_text)

        if title_text:
            return title_text

    for line in lines:
        if line.startswith("#"):
            return line.lstrip("#").strip()

    return ""


def find_market_price(lines):
    for line in lines:
        if re.fullmatch(r"\$[\d,]+(?:\.\d+)?|\$—", line):
            return {
                "currency": "USD",
                "value": money_to_number(line),
                "raw": line,
            }

    return {
        "currency": "USD",
        "value": None,
        "raw": "",
    }


def find_hp(lines):
    for line in lines:
        match = re.search(r"\bHP\s*(\d+)\b", line, re.I)

        if match:
            return int(match.group(1))

    return None


def find_supertype(lines):
    for line in lines:
        if line in {"Pokémon", "Pokemon"}:
            return "Pokemon"

        if line == "Trainer":
            return "Trainer"

        if line == "Basic Energy":
            return "Basic Energy"

        if line == "Special Energy":
            return "Special Energy"

        if line == "Energy":
            return "Energy"

    return ""


def find_stage_and_evolves_from(lines):
    stage = ""
    evolves_from = ""

    for line in lines:
        if "Evolves from" in line:
            parts = line.split("Evolves from", 1)
            stage = clean_text(parts[0].replace("–", "").replace("-", ""))
            evolves_from = clean_text(parts[1])
            return stage, evolves_from

        if line in {"Basic", "Stage 1", "Stage 2", "Level-Up", "Restored"}:
            stage = line

    return stage, evolves_from


def find_metadata(lines, set_config=None):
    expansion_raw = get_next_line_after_label(lines, "Expansion")
    card_number = get_next_line_after_label(lines, "Card number")
    rarity = get_next_line_after_label(lines, "Rarity")

    illustrators = get_next_line_after_label(lines, "Illustrators")

    if not illustrators:
        illustrators = get_next_line_after_label(lines, "Illustrator")

    pokedex = get_next_line_after_label(lines, "Pokédex")

    if not pokedex:
        pokedex = get_next_line_after_label(lines, "Pokedex")

    card_format = get_next_line_after_label(lines, "Card format")

    expansion_name = expansion_raw
    expansion_code = ""

    if expansion_raw:
        match = re.match(r"(.+)\s+([A-Z0-9]{1,5})$", expansion_raw)
        if match:
            expansion_name = clean_text(match.group(1))
            expansion_code = clean_text(match.group(2))

    if not expansion_name and set_config:
        expansion_name = set_config.get("display_name", "")

    return {
        "expansion": expansion_name,
        "set_code": expansion_code,
        "card_number": card_number,
        "rarity": "" if rarity == "—" else rarity,
        "illustrator": illustrators,
        "pokedex_number": pokedex.replace("#", "").strip(),
        "format": card_format,
    }


def find_collector_number(card_number):
    match = re.match(r"(\d+)\s*/", card_number or "")

    if match:
        return int(match.group(1))

    return None


def remove_noise_tokens(tokens):
    start_index = 0

    for i, token in enumerate(tokens):
        value = token.get("value", "")

        if re.fullmatch(r"\$[\d,]+(?:\.\d+)?|\$—", value):
            start_index = i
            break

    return tokens[start_index:]


def is_energy_image_token(token):
    if token["kind"] != "image":
        return False

    value = clean_text(token.get("value", ""))

    return value in ENERGY_TYPES


def find_first_index(tokens, value):
    for i, token in enumerate(tokens):
        if token.get("kind") == "text" and token.get("value") == value:
            return i

    return -1


def next_text_token(tokens, start):
    for i in range(start, len(tokens)):
        if tokens[i]["kind"] == "text" and tokens[i].get("value"):
            return i, tokens[i]["value"]

    return -1, ""


def parse_powers_and_attacks(soup: BeautifulSoup):
    tokens = remove_noise_tokens(get_document_tokens(soup))

    weakness_idx = find_first_index(tokens, "Weakness")
    expansion_idx = find_first_index(tokens, "Expansion")

    stop_idx = len(tokens)

    if weakness_idx != -1:
        stop_idx = min(stop_idx, weakness_idx)

    if expansion_idx != -1:
        stop_idx = min(stop_idx, expansion_idx)

    powers = []
    attacks = []

    i = 0

    while i < stop_idx:
        token = tokens[i]
        value = token.get("value", "")

        if token["kind"] == "text" and value in POWER_LABELS:
            power_kind = value

            name_index, power_name = next_text_token(tokens, i + 1)

            if name_index == -1:
                i += 1
                continue

            text_parts = []
            j = name_index + 1

            while j < stop_idx:
                t = tokens[j]
                v = t.get("value", "")

                if t["kind"] == "text" and v in POWER_LABELS:
                    break

                if is_energy_image_token(t):
                    break

                if t["kind"] == "text" and v not in CARD_SECTION_LABELS:
                    text_parts.append(v)

                j += 1

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
            cost = []

            while i < stop_idx and is_energy_image_token(tokens[i]):
                cost.append(tokens[i]["value"])
                i += 1

            name_index, attack_name = next_text_token(tokens, i)

            if name_index == -1:
                continue

            damage = ""
            text_parts = []

            damage_index, possible_damage = next_text_token(tokens, name_index + 1)

            if damage_index != -1 and re.fullmatch(r"[\d+×xX\-]+", possible_damage):
                damage = possible_damage
                j = damage_index + 1
            else:
                j = name_index + 1

            while j < stop_idx:
                t = tokens[j]
                v = t.get("value", "")

                if is_energy_image_token(t):
                    break

                if t["kind"] == "text" and v in POWER_LABELS:
                    break

                if t["kind"] == "text" and v in CARD_SECTION_LABELS:
                    break

                if t["kind"] == "text":
                    text_parts.append(v)

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


def parse_rules_text(lines, supertype):
    if supertype not in {"Trainer", "Special Energy"}:
        return ""

    start_index = -1

    for i, line in enumerate(lines):
        if line == supertype:
            start_index = i + 1
            break

    if start_index == -1:
        return ""

    parts = []

    for line in lines[start_index:]:
        if line in CARD_SECTION_LABELS:
            break

        if line not in {"0"}:
            parts.append(line)

    return clean_text(" ".join(parts))


def infer_energy_provides(name, lines):
    provides = []

    provides_line = get_next_line_after_label(lines, "Provides")

    if provides_line and provides_line != "—":
        provides.append(provides_line)

    if not provides and name.endswith(" Energy"):
        possible = name.replace(" Energy", "").strip()

        if possible:
            provides.append(possible)

    return provides


def infer_filter_type_from_href(href):
    if not href:
        return ""

    parsed = urlparse(href)
    query = parse_qs(parsed.query)

    for key in query:
        value = query[key][0]

        for energy_type in ENERGY_TYPES:
            if value.lower() == energy_type.lower():
                return energy_type

    return ""


def parse_weakness_resistance_retreat(soup: BeautifulSoup, lines):
    tokens = remove_noise_tokens(get_document_tokens(soup))

    weakness = []
    resistance = []
    retreat_cost = []

    def parse_labeled_value(label):
        idx = find_first_index(tokens, label)

        if idx == -1:
            return "", "", ""

        found_type = ""
        found_value = ""
        found_href = ""

        for j in range(idx + 1, min(idx + 8, len(tokens))):
            token = tokens[j]

            if token["kind"] == "image":
                candidate = clean_text(token.get("value", ""))

                if candidate and candidate not in {"", "Rare", "Rare Holo"}:
                    found_type = candidate
                    found_href = token.get("href", "")

            if token["kind"] == "text":
                value = token.get("value", "")

                if value in CARD_SECTION_LABELS:
                    break

                if value and value != "—":
                    found_value = value
                    found_href = token.get("href", found_href)
                    break

        return found_type, found_value, found_href

    weakness_type, weakness_value, weakness_href = parse_labeled_value("Weakness")

    if weakness_value:
        weakness.append(
            {
                "type": weakness_type or infer_filter_type_from_href(weakness_href),
                "value": weakness_value,
                "source_href": weakness_href,
            }
        )

    resistance_type, resistance_value, resistance_href = parse_labeled_value("Resistance")

    if resistance_value:
        resistance.append(
            {
                "type": resistance_type or infer_filter_type_from_href(resistance_href),
                "value": resistance_value,
                "source_href": resistance_href,
            }
        )

    retreat_idx = find_first_index(tokens, "Retreat Cost")
    expansion_idx = find_first_index(tokens, "Expansion")

    if retreat_idx != -1:
        end_idx = expansion_idx if expansion_idx != -1 else min(retreat_idx + 10, len(tokens))

        retreat_hrefs = []
        retreat_images = []

        for token in tokens[retreat_idx + 1 : end_idx]:
            if token["kind"] == "image":
                if token.get("value") in ENERGY_TYPES:
                    retreat_images.append(token.get("value"))
                elif token.get("value") == "":
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


def download_image(fetcher: PageFetcher, image_url: str, target_path: Path):
    if not image_url:
        return ""

    if target_path.exists() and target_path.stat().st_size > 0:
        return str(target_path).replace("\\", "/")

    print(f"Downloading image: {image_url}")

    response = fetcher.session.get(image_url, timeout=30)

    if response.status_code == 403:
        print("Image request got 403. Trying browser download.")
        fetcher.start_playwright()
        image_response = fetcher.page.goto(image_url, wait_until="domcontentloaded", timeout=60000)

        if image_response is None:
            raise RuntimeError(f"Could not download image: {image_url}")

        body = image_response.body()
        target_path.parent.mkdir(parents=True, exist_ok=True)
        target_path.write_bytes(body)
        return str(target_path).replace("\\", "/")

    response.raise_for_status()

    target_path.parent.mkdir(parents=True, exist_ok=True)
    target_path.write_bytes(response.content)

    return str(target_path).replace("\\", "/")


def image_extension_from_url(image_url):
    path = urlparse(image_url).path
    suffix = Path(path).suffix.lower()

    if suffix in {".jpg", ".jpeg", ".png", ".webp"}:
        return suffix

    return ".jpg"


def normalize_pokemon_type_from_lines(lines):
    for line in lines:
        for energy_type in ENERGY_TYPES:
            if line == energy_type:
                return energy_type
    return ""


def parse_card_page(fetcher: PageFetcher, set_config, card_info):
    soup = fetcher.get_soup(card_info["source_url"])
    lines = get_page_lines(soup)

    name = find_name(soup, lines)
    image_url = image_url_from_card_page(soup)
    market_price = find_market_price(lines)
    hp = find_hp(lines)
    supertype = find_supertype(lines)
    stage, evolves_from = find_stage_and_evolves_from(lines)
    metadata = find_metadata(lines, set_config)

    card_number = metadata["card_number"] or card_info.get("card_number", "")
    collector_number = find_collector_number(card_number) or card_info.get("collector_number")

    powers, attacks = parse_powers_and_attacks(soup)
    weakness, resistance, retreat_cost = parse_weakness_resistance_retreat(soup, lines)

    rules_text = parse_rules_text(lines, supertype)
    provides = infer_energy_provides(name, lines)
    pokemon_type = normalize_pokemon_type_from_lines(lines) if supertype == "Pokemon" else ""

    local_image_path = ""
    image_path = ""
    card_id = make_card_id(set_config["slug"], collector_number, name)

    if image_url and collector_number:
        ext = image_extension_from_url(image_url)
        filename = f"{collector_number:03d}-{slugify(name)}{ext}"
        target_path = IMAGE_ROOT_DIR / set_config["slug"] / filename
        local_image_path = download_image(fetcher, image_url, target_path)
        image_path = f"{PUBLIC_IMAGE_ROOT_PATH}/{set_config['slug']}/{filename}"

    elif image_url:
        hash_part = hashlib.sha1(image_url.encode("utf-8")).hexdigest()[:8]
        ext = image_extension_from_url(image_url)
        filename = f"{slugify(name)}-{hash_part}{ext}"
        target_path = IMAGE_ROOT_DIR / set_config["slug"] / filename
        local_image_path = download_image(fetcher, image_url, target_path)
        image_path = f"{PUBLIC_IMAGE_ROOT_PATH}/{set_config['slug']}/{filename}"

    card = {
        "id": card_id,
        "name": name,
        "set_slug": set_config["slug"],
        "set_name": set_config["display_name"],
        "card_number": card_number,
        "collector_number": collector_number,
        "source_url": card_info["source_url"],
        "image_url": image_url,
        "local_image_path": local_image_path,
        "image_path": image_path,
        "supertype": supertype,
        "subtypes": [stage] if stage else [],
        "stage": stage,
        "pokemon_type": pokemon_type,
        "hp": hp,
        "evolves_from": evolves_from,
        "powers": powers,
        "attacks": attacks,
        "weakness": weakness,
        "resistance": resistance,
        "retreat_cost": retreat_cost,
        "rules_text": rules_text,
        "provides": provides,
        "rarity": metadata["rarity"],
        "illustrator": metadata["illustrator"],
        "pokedex_number": metadata["pokedex_number"],
        "format": metadata["format"],
        "market_price": market_price,
    }

    return card


def save_json(data, output_path: Path):
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with output_path.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

    print(f"Saved JSON: {output_path}")


def summarize_database(combined_output):
    cards = combined_output["cards"]
    by_supertype = {}
    by_set = {}

    for card in cards:
        by_supertype[card.get("supertype") or "Unknown"] = by_supertype.get(card.get("supertype") or "Unknown", 0) + 1
        by_set[card.get("set_slug") or "unknown"] = by_set.get(card.get("set_slug") or "unknown", 0) + 1

    return {
        "total_cards": len(cards),
        "by_supertype": by_supertype,
        "by_set": by_set,
        "total_errors": len(combined_output["errors"]),
    }


def main():
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    IMAGE_ROOT_DIR.mkdir(parents=True, exist_ok=True)

    fetcher = PageFetcher()

    combined_output = {
        "sets": [],
        "cards": [],
        "errors": [],
        "generated_from": [set_config["url"] for set_config in SETS],
    }

    try:
        for set_config in SETS:
            print("\n" + "=" * 80)
            print(f"Scraping set: {set_config['display_name']}")
            print("=" * 80)

            set_data = parse_set_page(fetcher, set_config)

            print(f"Set: {set_data['set']['name']}")
            print(f"Found card links: {len(set_data['card_links'])}")

            set_output = {
                "set": set_data["set"],
                "cards": [],
                "errors": [],
            }

            for index, card_info in enumerate(set_data["card_links"], start=1):
                print(f"\n[{set_config['display_name']} {index}/{len(set_data['card_links'])}] {card_info['card_number']}")

                try:
                    card = parse_card_page(fetcher, set_config, card_info)
                    set_output["cards"].append(card)
                    combined_output["cards"].append(card)

                    print(f"  ID: {card['id']}")
                    print(f"  Name: {card['name']}")
                    print(f"  Type: {card['supertype']}")
                    print(f"  Stage: {card['stage']}")
                    print(f"  Powers: {len(card['powers'])}")
                    print(f"  Attacks: {len(card['attacks'])}")
                    print(f"  Image: {card['image_path']}")

                except Exception as exc:
                    print(f"  ERROR: {exc}")

                    error = {
                        "set_slug": set_config["slug"],
                        "set_name": set_config["display_name"],
                        "card_number": card_info.get("card_number", ""),
                        "source_url": card_info.get("source_url", ""),
                        "error": str(exc),
                    }

                    set_output["errors"].append(error)
                    combined_output["errors"].append(error)

                save_json(set_output, DATA_DIR / set_config["json_name"])
                save_json(combined_output, COMBINED_JSON_OUTPUT)
                time.sleep(REQUEST_DELAY_SECONDS)

            combined_output["sets"].append(set_output["set"])

            save_json(set_output, DATA_DIR / set_config["json_name"])
            save_json(combined_output, COMBINED_JSON_OUTPUT)

        combined_output["summary"] = summarize_database(combined_output)
        save_json(combined_output, COMBINED_JSON_OUTPUT)

        print("\nDone.")
        print(json.dumps(combined_output["summary"], indent=2))
        print(f"Combined JSON file: {COMBINED_JSON_OUTPUT}")
        print(f"Image root folder: {IMAGE_ROOT_DIR}")

    finally:
        fetcher.close()


if __name__ == "__main__":
    main()
