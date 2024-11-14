factCheckLLMHost = "http://localhost:8080"

//TODO: On error, open snackbar/alert
//TODO: On no claim, open snackbar/alert
//TODO: State machine (disable buttons once requested, store standard page version v edited)

// Add selection option to context menu on start
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "factCheckLLM-Passage-API",
    title: "Ask FactCheckLLM",
    contexts: ["selection"],
  })
  chrome.contextMenus.create({
    id: "factCheckLLMReset",
    title: "Clear FactCheckLLM Annotation",
    contexts: ["all"],
  });
});

// Setup listener for passageSelection event
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "factCheckLLM-Passage-API") {
    // Reset page
    chrome.tabs.sendMessage(tab.id, { action: "reset" })

    // Query LLM Server
    let resPromise = POST(factCheckLLMHost + "/passage", {text: info.selectionText})
    chrome.tabs.sendMessage(tab.id, { action: "apiCallStart" })

    // Update page based on response
    resPromise.then((res) => chrome.tabs.sendMessage(tab.id, { action: "processPassageResponse", data: res }, (response) => {
      if (response && response.status === "200") {
        console.log("Highlighting completed successfully.");
      }
      else (
        console.error("Error calling `/passages`: ", response)
      )
    })).catch(err => {
      console.error("Error calling `/passages`: ", err)
    }).finally(() => {
      chrome.tabs.sendMessage(tab.id, { action: "apiCallComplete" })
    });
  }
  else if (info.menuItemId === "factCheckLLMReset") {
    // Reset page
    chrome.tabs.sendMessage(tab.id, { action: "reset" })
  }
});

// REST functions
async function GET(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    const json = await response.json();
    return json;
  } catch (error) {
    console.error(error.message);
    return undefined;
  }
}

async function POST(url, postBody) {
  try {
    const jsonBody = JSON.stringify(postBody)
    const contentLength = new TextEncoder().encode(jsonBody).length;

    const response = await fetch(url, {
      method: "POST",
      body: jsonBody,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': contentLength.toString()
      },
    })
    if (!response.ok) {
      console.error(response)
      throw new Error(`Response status: ${response.status}`);
    }

    const json = await response.json();
    return json;
  } catch (error) {
    console.error(error.message);
    return undefined;
  }
}