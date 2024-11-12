import requests
import asyncio
import aiohttp
import nest_asyncio
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from langchain.llms import Ollama
from fuzzywuzzy import fuzz
from fuzzywuzzy import process
import nest_asyncio
import asyncio
import aiohttp
from bs4 import BeautifulSoup
import nltk
from nltk.tokenize import sent_tokenize
import nltk
nltk.download('punkt')
from langchain.prompts import PromptTemplate
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from langchain.llms import Ollama
import re

OLLAMA_MODEL = "llama3.2"
# OLLAMA_MODEL = "llama2"
OLLAMA_HOST = "http://host.docker.internal:11434" # for when running within docker image
# OLLAMA_HOST = "http://localhost:11434"

nest_asyncio.apply()
ollama_model = Ollama(model=OLLAMA_MODEL, base_url=OLLAMA_HOST)

from langchain_core.prompts import PromptTemplate
from langchain_core.prompts import FewShotPromptTemplate


claim_parse_example_prompt = PromptTemplate.from_template("Text: {input}\nOutput:\n{response}")
claim_parse_examples = [{
    "input": """The New York Times Tech Guild ended its unfair labor practice strike Monday, one week after a majority of the 600-person unit walked off the job just before Election Day.""",
    "response": """'The New York Times Tech Guild ended its unfair labor practice strike Monday': The New York Times Tech Guild ended its strike Monday."""
},
{
    "input": "@realDonaldTrump: Lyin’ Kamala is giving a News Conference now, saying that I want to end the Affordable Care Act. I never mentioned doing that, never even thought about such a thing. She also said I want to end Social Security. Likewise, never mentioned it, or thought of it. She is the one that wants to end Social Security and, she will do it, by putting the millions of Migrants coming into our Country into it. Kamala is a LIAR! Everything that comes out of her mouth is a LIE. It’s MADE UP FICTION, and she’s doing it because she’s losing, and losing BIG!",
    "response" : """Excerpt: 'Lyin’ Kamala is giving a News Conference now, saying that I want to end the Affordable Care Act.'\nRestatement: Kamala Harris has said that Donald Trump wants to end the Affordable Care Act.
Excerpt: 'I never mentioned doing that, never even thought about such a thing'\nRestatement: Donald Trump never said he wanted to end the Affordable Care Act.
Excerpt: 'She also said I want to end Social Security.'\nRestatement: Kamala Harris said that Donald Trump wants to end Social Security.
Excerpt: 'Likewise, never mentioned it, or thought of it'\nRestatement: Donald Trump never mentioned he wanted to end Social Security.
Excerpt: 'She is the one that wants to end Social Security and, she will do it'\nRestatement: Kamala Harris will end Social Security.
Excerpt: 'by putting the millions of Migrants coming into our Country into it.'\nRestatement: Kamala Harris plans to add millions of migrants to Social Security.
Excerpt: 'she’s losing, and losing BIG!'\nRestatement: Kamala Harris is losing the election."""
},
{
    "input": """
        Blooming flower buds next to trees with changing leaves. Fans and air conditioners working overtime. Iced coffees instead of hot ones. Temperatures more like Florida than the Mid-Atlantic. The weather has been weirdly warm in the eastern two-thirds of the United States as November gets started — more than 10 degrees above average across parts of over 20 states.

        Want to know how your actions can help make a difference for our planet? Sign up for the Climate Coach newsletter, in your inbox every Tuesday and Thursday.
        Conditions in the Rockies and on the West Coast have balanced out some of the unusual eastern warmth, with cooler-than-average temperatures and a big early-season dump of snow.

        But in the eastern half of the nation, will you eventually be able to pull out your hats and gloves this coming winter? Or is the subtropical weather here to stay?
    """,
    "response": """Excerpt: 'The weather has been weirdly warm in the eastern two-thirds of the United States as November gets started — more than 10 degrees above average across parts of over 20 states.'\nRestatement: The weather has been 10 degrees above average across parts of 20 states.
Excerpt: 'Conditions in the Rockies and on the West Coast have balanced out some of the unusual eastern warmth, with cooler-than-average temperatures and a big early-season dump of snow.'\nRestatement: The Rockies have had cooler-than-average temperatures and large, early amounts of snow."""
},
{
    "input": """
        Silent snowfall drifts,
        blanketing the world in white,
        winter’s breath, so still.
    """,
    "response": """No notable claims found."""
},
{
    "input": """What are the most effective strategies for enhancing productivity in a remote work environment? How do different communication styles impact team dynamics? Is it possible to boost creativity through structured brainstorming sessions, or do they stifle innovation? What role does technology play in maintaining work-life balance? Should companies prioritize flexibility over traditional work hours, and what are the potential downsides of doing so? How can organizations ensure that they are fostering an inclusive culture for employees from diverse backgrounds? What metrics should be used to evaluate employee satisfaction effectively? Is there a way to quantify the long-term benefits of professional development programs? How can leaders balance transparency with confidentiality in decision-making?""",
    "response": """No notable claims found."""
},
{
    "input": """
        Eboni Thompson’s Instagram isn’t just an ode to the classic literature that she loves. It’s also a celebration of annotation: Warmly lit video reels linger on the colorful tabs that fringe the edges of her Penguin Classics, the ruler-straight lines highlighting important passages and the margins where neat handwriting frames each page.

        Annotations have traditionally been the domain of academics, used to add commentary, feedback and criticism to texts. Annotation is “elemental to scholarship,” according to Remi Kalir and Antero Garcia, who literally wrote the book on annotation (“Annotation,” MIT Press). As a reminder of the high-minded history of marginalia, they note that Milton annotated Shakespeare.
    """,
    "response": """Excerpt: 'Annotation is “elemental to scholarship,” according to Remi Kalir and Antero Garcia'\nRestatement: Remi Kalir and Antero Garcia said that annotation is elemental to scholarship.
Excerpt: 'who literally wrote the book on annotation (“Annotation,” MIT Press)'\nRestatement: Remi Kalir and Antero Garcia wrote a book on annotation."""
},
{
    "input": """BREAKING NEWS: BEYONCE WAS INVOLVED IN A HORRIFIC CAR CRASH! #RIPBEYONCE""",
    "response": """Excerpt:'BEYONCE WAS INVOLVED IN A HORRIFIC CAR CRASH! #RIPBEYONCE'\nRestatement: Beyonce has died in a car crash."""
}]

claim_parse_prompt = FewShotPromptTemplate(
    examples=claim_parse_examples,
    example_prompt=claim_parse_example_prompt,
    prefix="""You are an advanced language model tasked with identifying notable claims within a given text. For each claim, return:
- The exact excerpt where the claim is made.
- A summary of the claim, clarifying the main assertion.

Notable claims include:
- Allegations about events or actions.
- Statistics, figures, or specific measurements cited.
- Attributed quotes or opinions linked to a particular person or group.
- Predictions or assertions that could impact public perception or lead to real-world consequences if inaccurate.

If there are no notable claims in the text, return: "No notable claims found." Do not number the claims. Below are a series of examples.
""",
    suffix="\n\nNow, process the following text accordingly.\n\nText: {input}",
    input_variables=["input"],
)

few_shot_claim_chain = LLMChain(llm=ollama_model, prompt=claim_parse_prompt)

def extractClaimsLLM(passage: str):
    response = few_shot_claim_chain.run(input=passage)
    return llmResponseToStruct(response)

def llmResponseToStruct(text):
    # Define the regex pattern
    patternE = r'(?<=Excerpt:)\s*\'(.*?)\'(?=\s*Restatement:)'
    patternR = r'(?<=Restatement:)(.*?)(?=\s*Excerpt:|$)'
    
    # Find all matches using re.findall
    excerpt_matches = re.findall(patternE, text, re.DOTALL)  
    restatement_matches = re.findall(patternR, text, re.DOTALL) 
    
    print(text)
    print(excerpt_matches)
    print(restatement_matches)
    print(len(excerpt_matches), len(restatement_matches))

    # Store the matches in a list of dictionaries
    result = [{"excerpt": excerpt_matches[i].strip(), "claim": restatement_matches[i].strip()} for i in range(len(excerpt_matches))]

    return result