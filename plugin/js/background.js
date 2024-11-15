//TODO: On error, open snackbar/alert
//TODO: On no claim, open snackbar/alert

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
    chrome.tabs.sendMessage(tab.id, { action: "newPassageRequest", data: info.selectionText })
  }
  else if (info.menuItemId === "factCheckLLMReset") {
    // Reset page
    chrome.tabs.sendMessage(tab.id, { action: "reset" })
  }
});