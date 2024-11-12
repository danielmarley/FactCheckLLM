function resetPage() {
  // $('span.claim').each(function() {
  //   const originalText = $(this).data('excerpt');
  //   $(this).replaceWith(originalText);
  // });
  $('[data-factcheckuntouched]').each(function() {
    const originalInnerHtml = $(this).attr('data-factcheckuntouched');
    $(this).removeAttr('data-factcheckuntouched')
    $(this).html(originalInnerHtml);
  });
}

function processPassageResponse(excerptsWithClaims) {
  excerptsWithClaims.forEach((item) => {
    const { excerpt, claim, label, reply } = item;
    const claimClass = getClaimClass(label);
    // Use jQuery to highlight excerpts in the DOM
    const claimDiv = $(`*:contains("${excerpt}")`)
      .not('script')
      .not('head')
      .not('link')
      .last();
    const textContent = claimDiv[0].textContent;

    // claimDiv.data('factcheckuntouched', claimDiv[0].innerHTML)
    claimDiv.attr('data-factcheckuntouched', claimDiv[0].innerHTML)
    const highlightHTML = `
      <span class="claim ${claimClass}" data-excerpt="${excerpt}" data-claim="${claim}">
        ${excerpt}
      </span>
    `;

    const excerptRegex = new RegExp(excerpt, 'g');
    const newContent = textContent.replace(excerptRegex, highlightHTML)
    claimDiv.html(newContent);
  });

  // Add hover event listeners with jQuery
  $(".claim").hover(
    function (event) { showTooltip(event); },
    function (event) { hideTooltip(event); }
  );
}

function getClaimClass(claim) {
  switch (claim.label) {
    case "True":
      return "true"
    case "Mostly True":
      return "mostly-true"
    case "False":
      return "false"
    case "Mostly False":
      return "mostly-false"
    case "Unsupported":
      return "unsupported"
    default:
      console.error("Unrecognized claim label: " + claim.label)
      return "unsupported"
  }
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