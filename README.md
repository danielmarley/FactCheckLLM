# FactCheckLLM
### Table of Contents
- [Steps to Run](#steps-to-run)
- [Python Server Endpoints](#python-server-endpoints)
-----------------
## Steps to Run
#### 1) Install Ollama
* Navigate to https://ollama.com/download
* Download and install version for OS
* Check that ollama service is running by executing `ollama serve`
    * If already running you'll see an error that the port 11434 is in use
* Execute `ollama pull llama3` and `ollama pull llama3.2` to pull Llama7B and Llama3B respectively

#### 2) Build and run the docker image
The docker image is used to execute jupyter notebook in a Linux environment. It executes as root and installs the playwright packages needed as root as part of the build. Assuming you have docker already installed and docker service is running, then from within the project dir:
* Run `docker build --no-cache -t jupyter-playwright .` to build the image
* Then in Powershell, `docker run -p 8080:8080 -p 8888:8888 -p 11434:11434 -v "${PWD}:/home/root/work" jupyter-playwright` to run the image and start jupyter notebook; the localhost URL will be logged out to console at this time and you can copy from there for use of the token
    * `${PWD}` maps your currenrt working directory to the Docker workspace in Powershell notation
* Can then develop and run inside the jupyter notebook with the same Linux libraries as collab while the notebook connects to a faster, local version of Llama

#### 3) Run the FastAPI server
In jupyter notebooks, launch a console and execute `playwright install` first. Then you can run `python server.py` to serve the file on port 8080. You could also run `uvicorn server:app --reload --port 8080 --host 0.0.0.0` and that will refresh the server on any file changes.

#### 4) Run the web plugin in Chrome
* Go to the Extensions page by entering chrome://extensions in a new tab. 
* Enable Developer Mode by clicking the toggle switch next to Developer mode. (was in the top right for me)
* Click the Load unpacked button and select the 'plugin' directory from this workspace.
* It's installed! Any time you update though you will need to refresh the plugin manually from the chrome extension page.

-----------------
## Python Server Endpoints
* `GET`: `/health`
    * response:
        * `status`: `ok`
* `POST`: `/passage`
    * body: JSON
        * `text`: Body of text to be split into claims
    * response: JSON[]
        * `excerpt`: Exact excerpt from input passage related to claim
        * `claim`: Claim identified and researched from excerpt
        * `label`: Assigned label of "True", "Mostly True", "Mostly False", "False" or "Not Enough Evidence"
        * `reply`: LLM response and justification of assigned label
* `POST`: `/claim`
    * body: JSON
        * `claim`: Individual claim to be researched
    * response: JSON
        * `claim`: Claim researched
        * `label`: Assigned label of "True", "Mostly True", "Mostly False", "False" or "Not Enough Evidence"
        * `reply`: LLM response and justification of assigned label
* `POST`: `/feedback`
    * body: JSON
        * `claim`: Individual claim to be researched
        * `additional_context`: Added context or review/rating of claim label
    * response: JSON
        * `claim`: Claim researched
        * `context`: Added context
        * `label`: Assigned label of "True", "Mostly True", "Mostly False", "False" or "Not Enough Evidence"
        * `reply`: LLM response and justification of assigned label