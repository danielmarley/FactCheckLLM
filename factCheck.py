from apiCalls import fetch_article_content, fetch_factcheck_articles, fetch_news_articles

from langchain_core.prompts import PromptTemplate
from langchain_core.prompts import FewShotPromptTemplate
from langchain.chains import LLMChain
from langchain_community.llms import Ollama
from langchain._api import LangChainDeprecationWarning
import requests
import asyncio
import nest_asyncio
from bs4 import BeautifulSoup, XMLParsedAsHTMLWarning
import nltk
from nltk.tokenize import sent_tokenize
import nltk
import re
import random

import warnings

# Suppress specific warnings
warnings.filterwarnings("ignore", category=XMLParsedAsHTMLWarning)
warnings.filterwarnings("ignore", category=LangChainDeprecationWarning)

nltk.download('punkt')
nest_asyncio.apply()

OLLAMA_DEFAULT_MODEL = "llama3.2"
# OLLAMA_MODEL = "llama2"
OLLAMA_HOST = "http://host.docker.internal:11434" # for when running within docker image
# OLLAMA_HOST = "http://localhost:11434"

default_model = Ollama(model=OLLAMA_DEFAULT_MODEL, base_url=OLLAMA_HOST)

async def generate_context_and_assess_claim(claim, context, model):
    if (model == None):
        model = default_model

    # Fetch news articles related to the claim
    if context == "":
        # Fetch both fact check sources and raw news
        fc_articles_promise = fetch_factcheck_articles(claim)
        news_articles_promise = fetch_news_articles(claim)
        snopes_articles_promise = fetch_snopes_articles(claim)
        politiFact_articles_promise = fetch_politiFact_articles(claim)

        news_articles = await fc_articles_promise;
        print("FactCheck Articles:", news_articles)

        news_articles += await news_articles_promise
        print("News Articles:", news_articles)

        news_articles += await snopes_articles_promise
        print("Snopes Articles:", news_articles)

        news_articles += await politiFact_articles_promise
        print("Politifact Articles:", news_articles)

        if news_articles:
            # Limit to top 5 articles
            top_articles = []
            if len(news_articles) <= 3:
                top_articles = news_articles;
            else:
                top_articles = random.sample(news_articles, 3)

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
    1. State if it is True, Mostly True, Mostly False, False, or Not Enough Evidence to make a decision, inline with the following:
        * TRUE – The statement is accurate and there’s nothing significant missing.
        * MOSTLY TRUE – The statement is accurate but needs clarification or additional information.
        * MOSTLY FALSE – The statement contains an element of truth but ignores critical facts that would give a different impression.
        * FALSE – The statement is not accurate.
        * NOT ENOUGH EVIDENCE - You do not have the adequate information to judge if a statement is true or false.
    2. Provide relevant context or background information.
    3. List key facts and evidence related to this claim.
    4. Mention opposing views or evidence.
    5. If the claim is false, provide the correct information.
    """

    prompt = PromptTemplate(template=context_template, input_variables=["claim"])
    chain = LLMChain(llm=model, prompt=prompt)

    response = await chain.arun({"claim": claim})

    return response, context

async def claimFeedback(claim, context, userFeedback):
    context += f"\nAdditional Context: {userFeedback}"
    print("\nRe-running the LLM chain with updated context...")
    new_response, context = await generate_context_and_assess_claim(claim, context, None)
    pattern = r"\b(Mostly True|Mostly False|True|False|Not Enough Evidence)\b"
    match = re.search(pattern, new_response, re.IGNORECASE)
    label = "Unsupported"
    if match:
        label = match.group(0)  # Return the matched label
    return { "reply": new_response, "label": label, "context": context }


async def factCheckSingleClaim(claim, model=None):
    context = ""
    print("CLAIM: " + claim)
    result, context = await generate_context_and_assess_claim(claim, context, model)
    pattern = r"\b(Mostly True|Mostly False|True|False|Not Enough Evidence)\b"
    match = re.search(pattern, result, re.IGNORECASE)
    label = "Unsupported"
    if match:
        label = match.group(0)  # Return the matched label
    return { "reply": result, "label": label, "context": context }


async def factCheckSingleClaimNoContext(claim, model=None):
    if (model == None):
        model = default_model

    context_template = f"""
    You are an assistant that provides factual information.
    Analyze the following claim: '{claim}'.
    1. State if it is True, Mostly True, Mostly False, False, or Not Enough Evidence to make a decision, inline with the following:
        * TRUE – The statement is accurate and there’s nothing significant missing.
        * MOSTLY TRUE – The statement is accurate but needs clarification or additional information.
        * MOSTLY FALSE – The statement contains an element of truth but ignores critical facts that would give a different impression.
        * FALSE – The statement is not accurate.
        * NOT ENOUGH EVIDENCE - You do not have the adequate information to judge if a statement is true or false.
    2. Provide relevant context or background information.
    3. List key facts and evidence related to this claim.
    4. Mention opposing views or evidence.
    5. If the claim is false, provide the correct information.
    """

    prompt = PromptTemplate(template=context_template, input_variables=["claim"])
    chain = LLMChain(llm=model, prompt=prompt)

    response = await chain.arun({"claim": claim})

    pattern = r"\b(Mostly True|Mostly False|True|False|Not Enough Evidence)\b"
    match = re.search(pattern, response, re.IGNORECASE)
    label = "Unsupported"
    if match:
        label = match.group(0)  # Return the matched label
    return { "reply": response, "label": label }
