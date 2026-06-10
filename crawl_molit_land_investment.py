import json
import requests
from datetime import datetime, timedelta
from pathlib import Path

BASE_URL = "https://book.molit.go.kr/pyxis-api"
SEARCH_URL = BASE_URL + "/1/collections/3/search"
DETAIL_URL = BASE_URL + "/1/biblios/{id}"
OUTPUT_FILE = Path("land_investment_records.xlsx")

KEYWORDS = [
    "토지",
    "부동산",
    "투자",
    "용지",
    "택지",
    "지가",
    "개발",
    "재개발",
    "재건축",
    "토목",
    "토지이용",
    "국토",
    "토지투자",
    "부동산투자",
    "사업개요",
]

DEFAULT_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36"
}


def normalize_text(value):
    if value is None:
        return ""
    if not isinstance(value, str):
        value = str(value)
    return value.strip()


def matches_keywords(entry):
    haystack = " ".join(
        normalize_text(entry.get(key, ""))
        for key in ["titleStatement", "author", "publication", "etcContent", "keywords", "summary"]
    ).lower()
    return any(keyword in haystack for keyword in KEYWORDS)


def parse_etc_content(etc_content):
    if not etc_content:
        return {}
    try:
        return json.loads(etc_content)
    except Exception:
        return {"raw": etc_content}


def parse_marc_summary(content):
    if not content:
        return ""
    try:
        parsed = json.loads(content)
        fields = parsed.get("fields", [])
        summaries = []
        for field in fields:
            tag = field[0]
            if tag in {"500", "520", "505", "520", "520", "246"}:
                subfields = field[2:] if len(field) > 2 else []
                if subfields and isinstance(subfields[0], list):
                    for sf in subfields[0]:
                        if isinstance(sf, list) and len(sf) >= 2:
                            summaries.append(sf[1])
                elif isinstance(subfields, list):
                    summaries.append(str(subfields))
        return " ".join(summaries).strip()
    except Exception:
        return ""


def extract_detail_fields(detail_json):
    row = {
        "detail_summary": "",
        "detail_title": "",
        "detail_author": "",
        "detail_publication": "",
        "detail_claim_number": "",
        "detail_format": "",
        "detail_gov_publication_number": "",
        "detail_price": "",
        "detail_keywords": "",
    }

    if not detail_json:
        return row

    list_data = detail_json.get("data", {}).get("list", [])
    if not list_data:
        return row

    item = list_data[0]
    row["detail_title"] = normalize_text(item.get("titleStatement"))
    row["detail_author"] = normalize_text(item.get("author"))
    row["detail_publication"] = normalize_text(item.get("publication"))

    # Parse any possible summary or notes from KORMARC content
    row["detail_summary"] = parse_marc_summary(item.get("content"))

    # If there is a visible detail page summary under a different field name, preserve it here
    if item.get("summary"):
        row["detail_summary"] = normalize_text(item.get("summary"))

    # Try to collect any useful detail fields from the KORMARC content
    try:
        parsed = json.loads(item.get("content", "{}"))
        for field in parsed.get("fields", []):
            if not isinstance(field, list) or len(field) < 2:
                continue
            tag = field[0]
            if tag == "090":
                # 청구기호
                row["detail_format"] = " ".join([subfield[1] for subfield in field[3] if len(subfield) > 1])
            elif tag == "074":
                row["detail_gov_publication_number"] = " ".join([subfield[1] for subfield in field[3] if len(subfield) > 1])
            elif tag == "300":
                row["detail_format"] = row["detail_format"] or " ".join([subfield[1] for subfield in field[3] if len(subfield) > 1])
            elif tag == "500" and not row["detail_summary"]:
                row["detail_summary"] = " ".join([subfield[1] for subfield in field[3] if len(subfield) > 1])
            elif tag == "520" and not row["detail_summary"]:
                row["detail_summary"] = " ".join([subfield[1] for subfield in field[3] if len(subfield) > 1])
            elif tag == "245" and not row["detail_title"]:
                row["detail_title"] = " ".join([subfield[1] for subfield in field[3] if len(subfield) > 1])
    except Exception:
        pass

    return row


def fetch_json(url, params=None):
    response = requests.get(url, params=params, headers=DEFAULT_HEADERS, timeout=30)
    response.raise_for_status()
    return response.json()


def scrape():
    cutoff_date = datetime.now() - timedelta(days=365)
    records = []
    offset = 0
    max_per_page = 20
    stop_when_older = False

    while True:
        params = {"all": "", "abc": "", "offset": offset, "max": max_per_page}
        print(f"Fetching page offset={offset}")
        data = fetch_json(SEARCH_URL, params=params).get("data", {})
        page_list = data.get("list", [])
        if not page_list:
            break

        for item in page_list:
            date_str = normalize_text(item.get("dateReceived"))
            try:
                item_date = datetime.strptime(date_str, "%Y-%m-%d") if date_str else None
            except ValueError:
                item_date = None
            if item_date and item_date < cutoff_date:
                stop_when_older = True
                continue

            entry = {
                "id": item.get("id"),
                "title": normalize_text(item.get("titleStatement")),
                "author": normalize_text(item.get("author")),
                "publication": normalize_text(item.get("publication")),
                "date_received": date_str,
                "biblio_type": normalize_text(item.get("biblioType", {}).get("name")),
                "material_type": normalize_text(item.get("biblioType", {}).get("materialType", {}).get("name")),
                "thumbnail_url": normalize_text(item.get("thumbnailUrl")),
                "resources": ", ".join(
                    f"{resource.get('name')}({resource.get('type')})"
                    for resources in [item.get("resources", {}).get("F", [])]
                    for resource in resources
                ),
                "etc_content": json.dumps(parse_etc_content(item.get("etcContent")), ensure_ascii=False),
                "detail_url": f"https://book.molit.go.kr/book/#/search/detail/{item.get('id')}",
            }

            if matches_keywords(entry):
                detail_json = fetch_json(DETAIL_URL.format(id=item.get("id")))
                detail_fields = extract_detail_fields(detail_json)
                entry.update(detail_fields)
                records.append(entry)

        if stop_when_older:
            break

        offset += max_per_page
        if offset >= data.get("totalCount", 0):
            break

    return records


def save_excel(records):
    try:
        import pandas as pd
    except ImportError:
        raise ImportError("pandas is required to save Excel output. Install it with pip install pandas openpyxl")

    if not records:
        print("No records found for the given keyword filter.")
        return

    df = pd.DataFrame(records)
    df.to_excel(OUTPUT_FILE, index=False)
    print(f"Saved {len(records)} records to {OUTPUT_FILE.resolve()}")


if __name__ == "__main__":
    print("Starting land investment crawl...")
    records = scrape()
    save_excel(records)
