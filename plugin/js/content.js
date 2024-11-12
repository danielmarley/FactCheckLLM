function resetPage() {
  $('span.claim').each(function() {
    const originalText = $(this).data('excerpt');
    $(this).replaceWith(originalText);
  });
}

function processPassageResponse(excerptsWithClaims) {
    excerptsWithClaims.forEach((item) => {
    const { excerpt, claim } = item;

    // Use jQuery to highlight excerpts in the DOM
    $("body").html((_, html) => {
      const highlightHTML = `
        <span class="claim" data-excerpt="${excerpt}" data-claim="${claim}">
          ${excerpt}
        </span>
      `;
      const excerptRegex = new RegExp(excerpt, 'g');
      return html.replace(excerptRegex, highlightHTML);
    });
  });

  // Add hover event listeners with jQuery
  $(".claim").hover(
    function (event) { showTooltip(event); },
    function (event) { hideTooltip(event); }
  );
}

function showTooltip(event) {
  const claim = $(event.target).data("claim");
  const tooltip = $("<div>")
    .addClass("tooltip")
    .text(claim)
    .appendTo("body");

  const rect = event.target.getBoundingClientRect();
  tooltip.css({
    left: `${rect.left + window.scrollX}px`,
    top: `${rect.bottom + window.scrollY + 5}px`,
    display: "block"
  });

  $(event.target).data("tooltip", tooltip); // Store the tooltip element for later
}

function hideTooltip(event) {
  $(event.target).data("tooltip").remove();
}


// Listen for messages from background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "processPassageResponse") {
    processPassageResponse(message.data); // Call the function with the passed data
    sendResponse({ status: "200" });
  }
  else if (message.action === "reset") {
    resetPage();
  }
});