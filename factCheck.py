from langchain_core.prompts import PromptTemplate
from langchain_core.prompts import FewShotPromptTemplate
from langchain.chains import LLMChain
# from langchain.llms import Ollama
from langchain_community.llms import Ollama
import requests
import asyncio
import aiohttp
import nest_asyncio
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
import nest_asyncio
import asyncio
import aiohttp
from bs4 import BeautifulSoup
import nltk
from nltk.tokenize import sent_tokenize
import nltk
import re
import urllib.parse

nltk.download('punkt')
nest_asyncio.apply()

OLLAMA_MODEL = "llama3.2"
# OLLAMA_MODEL = "llama2"
OLLAMA_HOST = "http://host.docker.internal:11434" # for when running within docker image
# OLLAMA_HOST = "http://localhost:11434"

ollama_model = Ollama(model=OLLAMA_MODEL, base_url=OLLAMA_HOST)

async def fetch_article_content(url):
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(url) as response:
                response.raise_for_status()
                return await response.text()
    except Exception as e:
        print(f"Error fetching article content from {url}: {e}")
        return ""

async def factcheck_parser(claim):
    claim = urllib.parse.quote(claim)
    url = f"https://www.factcheck.org/search/#gsc.tab=0&gsc.q={claim}&gsc.sort="
    print(url)
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
                results.append({'title': title.strip(), 'url': link})

        await browser.close()
        return results

async def retrieve_articles(claim):
    articles = []
    articles.extend(await factcheck_parser(claim))
    return articles

# work in prograss: If no articles were found in any of the three datasets, then use
# newsAPI to try to find articles about the claim
def fetch_news_articles(claim):
    # claim is a space-seperated string.
    url = (
        'http://newsapi.org/v2/everything?'
        f'q={claim}&'
        'language=en&'
        'sortBy=relevancy&'
        'pageSize=30&'
        'apiKey=4ac92a95346643fdbdb26a7e4d0e98b1'
    )

    try:
        response = requests.get(url)
        response.raise_for_status()  # Throw an error for bad responses
        news_data = response.json()
        print(news_data)
        return news_data.get('articles', [])
    except Exception as e:
        print(f"Error fetching news articles: {e}")
        return []

async def generate_context_and_assess_claim(claim, context):
    # Fetch news articles related to the claim
    if context == "":
      news_articles = await retrieve_articles(claim)
      print("FactCheck Articles:", news_articles)

      # Combine articles from sources. still to do
      news_articles += fetch_news_articles(claim)
      print("News Articles:", news_articles)

      if news_articles:
          # Limit to top 3 articles
          top_articles = news_articles[:3]

          context += " Here are some recent summaries that provide context:\n"
          for article in top_articles:
              title = article['title']
              url = article['url']

              # Get the article content
              full_content = await fetch_article_content(url)
              description = article.get('description')

              if not description:
                  if full_content:
                      soup = BeautifulSoup(full_content, 'html.parser')
                      first_paragraph = soup.find('p')
                      description = first_paragraph.get_text(strip=True) if first_paragraph else 'No content available.'

                  else:
                      description = 'No content available.'

              article_context = f"- **{title}**: {description[:500]}... [Read more]({url})\n"  # Truncate to 500 chars
              context += article_context

    context_template = f"""
    You are an assistant that provides factual information.
    Analyze the following claim: '{claim}'.
    Context: {context}
    1. State if it is true, false, mostly true, mostly false, or not enough evidence to make a decision.
    2. Provide relevant context or background information.
    3. List key facts and evidence related to this claim.
    4. Mention opposing views or evidence.
    5. If the claim is false, provide the correct information.
    """

    prompt = PromptTemplate(template=context_template, input_variables=["claim"])
    chain = LLMChain(llm=ollama_model, prompt=prompt)

    response = await chain.arun({"claim": claim})

    return response, context

async def claimFeedback(claim, context, userFeedback):
    context += f"\nAdditional Context: {userFeedback}"
    print("\nRe-running the LLM chain with updated context...")
    new_response, context = await generate_context_and_assess_claim(claim, context)
    pattern = r"\b(Mostly True|Mostly False|True|False|Not Enough Evidence)\b"
    match = re.search(pattern, new_response, re.IGNORECASE)
    label = "Unsupported"
    if match:
        label = match.group(0)  # Return the matched label
    return { "reply": new_response, "label": label, "context": context }


async def factCheckSingleClaim(claim):
    context = ""
    result, context = await generate_context_and_assess_claim(claim, context)
    print("\n\nRESULT: \n\n")
    print(result)
    pattern = r"\b(Mostly True|Mostly False|True|False|Not Enough Evidence)\b"
    match = re.search(pattern, result, re.IGNORECASE)
    label = "Unsupported"
    if match:
        label = match.group(0)  # Return the matched label
    return { "reply": result, "label": label, "context": context }


# async def handle_feedback(response, claim, context):
#   while True:
#       print("\nResponse displayed to the user:")
#       print(response)

#       rating = input("Please rate the response on a scale of [good, bad, mostly relevant, mostly not relevant]: ").lower()

#       feedback = input("Do you have more context or corrections to provide? (y/n): ").lower()

#       if feedback == 'y':
#           additional_context = input("Please provide your additional context or corrections: ")
#           context += f"\nAdditional Context: {additional_context}"
#       else:
#         return

#       if rating in ['bad', 'mostly not relevant']:
#           print("\nRe-running the LLM chain with updated context...")
#           new_response = await generate_context_and_assess_claim(claim, context)
#           print("\nUpdated Response based on your feedback:")
#           print(new_response)
#       else:
#           print("Thank you for your feedback! No need for further changes.")
# async def main():
#     claim = "We would not have left $85 billion worth of brand-new, beautiful military equipment behind"
#     claim = input("Please enter a claim to be fact-checked: ")
#     context = ""
#     result = await generate_context_and_assess_claim(claim, context)
#     await handle_feedback(result, claim, context)

# if __name__ == "__main__":
#     asyncio.run(main())
