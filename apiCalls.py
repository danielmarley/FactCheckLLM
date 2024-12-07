import os
import hashlib
import json
import requests
import urllib.parse
from playwright.async_api import async_playwright
import aiohttp

def hash_string(input_string):
    """Generate a unique hash for a given string."""
    return hashlib.sha256(input_string.encode('utf-8')).hexdigest()

def get_cached_file_path(cache_dir, claim):
    """Return the file path for a cached claim."""
    os.makedirs(cache_dir, exist_ok=True)
    file_name = f"{hash_string(claim)}.json"
    return os.path.join(cache_dir, file_name)

def read_cached_data(file_path):
    """Read cached data from a JSON file."""
    with open(file_path, mode='r', encoding='utf-8') as file:
        return json.load(file)

def write_to_cache(file_path, data):
    """Write data to a JSON file for caching."""
    with open(file_path, mode='w', encoding='utf-8') as file:
        json.dump(data, file, ensure_ascii=False, indent=4)

def call_news_api(claim):
    """Fetch news articles for a claim, using multiple API keys to avoid rate limits."""
    base_url = (
        'http://newsapi.org/v2/everything?'
        f'q={claim}&'
        'language=en&'
        'sortBy=relevancy&'
        'pageSize=30&'
    )

    api_keys = ['4ac92a95346643fdbdb26a7e4d0e98b1',
                'af7f73cc8e7e43cc9d388c354ff270d6',
                '4c7b8c1f8c4349d3b7e9a0bc3995b066',
                '08b40b4c61b041ff9aaf75c0b20ea6c9']

    for api_key in api_keys:
        url = f"{base_url}apiKey={api_key}"
        try:
            response = requests.get(url)
            if response.status_code == 429:
                print(f"Rate limit reached for API key: {api_key}. Trying next key.")
                continue
            response.raise_for_status()  # Throw an error for bad responses other than 429
            news_data = response.json()
            articles = news_data.get('articles', [])
            return [{'title': article['title'], 'url': article['url']} for article in articles]
        except Exception as e:
            print(f"Error fetching news articles with API key {api_key}: {e}")
            continue

    print("All API keys exhausted or failed.")
    return []

async def fetch_news_articles(claim):
    """Get articles for a claim, using a local file cache to avoid rate limits."""
    file_path = get_cached_file_path('cache/news', claim)

    if os.path.exists(file_path):
        # print("Cache hit. Loading data from file.")
        return read_cached_data(file_path)

    print("Cache miss. Fetching data from API.")
    articles = call_news_api(claim)
    write_to_cache(file_path, articles)
    return articles

async def factcheck_parser(claim):
    """Fetch fact-checking articles for a claim using a browser and cache results."""
    file_path = get_cached_file_path('cache/factcheck', claim)

    if os.path.exists(file_path):
        # print("Cache hit. Loading data from file.")
        return read_cached_data(file_path)

    print("Cache miss. Fetching data from website.")
    claim = urllib.parse.quote(claim)
    url = f"https://www.factcheck.org/search/#gsc.tab=0&gsc.q={claim}&gsc.sort="
    # print(url)

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)  # Launch browser in headless mode
        context = await browser.new_context()
        page = await context.new_page()
        await page.goto(url)
        await page.wait_for_timeout(5000)  # Wait for the page to load

        articles = await page.query_selector_all('div.gs-webResult.gs-result')
        results = []

        for article in articles:
            title_tag = await article.query_selector('a.gs-title')
            if title_tag:
                title = await title_tag.inner_text()
                link = await title_tag.get_attribute('href')
                if title.strip() != '':
                    results.append({'title': title.strip(), 'url': link})

        await browser.close()
        write_to_cache(file_path, results)
        return results

async def fetch_factcheck_articles(claim):
    articles = []
    articles.extend(await factcheck_parser(claim))
    return articles

async def snopes_parser(claim):
    """Fetch snopes articles for a claim using a browser and cache results."""
    file_path = get_cached_file_path('cache/snopes', claim)

    if os.path.exists(file_path):
        return read_cached_data(file_path)

    print("Cache miss. Fetching data from website.")
    claim = urllib.parse.quote(claim)
    url = f"https://www.snopes.com/search/?#gsc.tab=0&gsc.page=1&gsc.q={claim}"

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)  # Launch browser in headless mode
        context = await browser.new_context()
        page = await context.new_page()
        await page.goto(url)
        await page.wait_for_timeout(5000)

        # Query for all article elements on the page
        article_elements = await page.query_selector_all('div.gs-webResult.gs-result')
        print(f"Found {len(article_elements)} articles")

        articles = []
        for element in article_elements:
            # Extract the title (inside <a class="gs-title">)
            title_element = await element.query_selector('a.gs-title')
            title = await title_element.inner_text() if title_element else "No title"

            # Extract the link (href attribute from <a> tag)
            link = await title_element.get_attribute('href') if title_element else "No link"

            articles.append({'title': title, 'link': link})

        # Close the browser after scraping
        await browser.close()

    write_to_cache(file_path, articles)
    return articles

async def fetch_snopes_articles(claim):
    articles = []
    articles.extend(await snopes_parser(claim))
    return articles


async def fetch_article_content(url):
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                response.raise_for_status()
                return await response.text()
    except Exception as e:
        print(f"Error fetching article content from {url}: {e}")
        return ""
