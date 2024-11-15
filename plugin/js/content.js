// Insert tooltip on page load
$(document).ready(function() {
  $(`<link rel="preconnect" href="https://fonts.googleapis.com">`).appendTo('head');
  $(`<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`).appendTo('head');
  $(`<link href="https://fonts.googleapis.com/css2?family=Funnel+Display:wght@300..800&display=swap" rel="stylesheet">`).appendTo('head');

  // Create the tooltip modal element
  $(`<div class='tooltipModal' id="tooltip" hidden="true">
      <div class="carat carat-top tooltipModal" hidden="true"></div>
      <div id="tooltip-content">
        <h2 id="claim">Claim: <span id="claimContent"></span></h2>
        <h3 id="label">Label: <span id="labelContent"></span></h2> 
        <h4 id="reasoningHeader">Explained Response: </h4>
        <p id="reasoningBody"></p>
        <div id="credits">Powered by FactCheckLLM</div>
      </div>
      <div class="carat carat-bottom tooltipModal" hidden="true"></div>
    </div>`).appendTo('body');

  // Create spinner
  $(`<div id="loadingSpinnerWrapper">
    <div id="loadingSpinner" style="display: block;"></div>
  </div>`).appendTo('body');
  
  // Keep tooltip open while interacting with it
  $('.tooltipModal').on('mouseleave', function(event) {
    // Get the element that the mouse moved into
    const newTarget = event.relatedTarget;

    // Check if the new target is not `.claim` or `.tooltipModal`
    if (!$(newTarget).closest('.claim').length && !$(newTarget).closest('.tooltipModal').length) {
        // Hide the tooltip if the mouse is outside of `.claim` and `.tooltipModal`
        $('#tooltip').hide();
    }
  });
});

// Reset annotation
function resetPage() {
  window.getSelection().removeAllRanges();
  $('[data-factcheckuntouched]').each(function() {
    const originalInnerHtml = $(this).attr('data-factcheckuntouched');
    $(this).removeAttr('data-factcheckuntouched')
    $(this).html(originalInnerHtml);
  });
}

// Process new passage request for LLM API
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

    const claimId = String(Math.floor(Math.random() * 1000000));
    claimDiv.attr('data-factcheckuntouched', claimDiv[0].innerHTML)
    const highlightHTML = `
      <span id='${claimId}' class="claim ${claimClass}" data-label="${label}">
        ${excerpt}
      </span>
    `;

    // const excerptRegex = new RegExp(excerpt, 'g');
    const newContent = textContent.replace(excerpt, highlightHTML)
    claimDiv.html(newContent);
    $(`#${claimId}`).data('reply', reply)
      .data('excerpt', excerpt)
      .data('claim', claim);
  });

  $('.claim').on('mouseenter', function(event) {
    const $tooltip = $('#tooltip');
    // Set the tooltip content
    const label = $(this).data('label')

    $tooltip.find('#claimContent').text($(this).data('claim'))
    $tooltip.find('#labelContent').text(label).removeClass().addClass(getClaimClass(label))
    $tooltip.find('#reasoningBody').text($(this).data('reply'))
    $('#tooltip-content').scrollTop(0);
    $tooltip.show()

    // Position the tooltip dynamically
    positionTooltip(event, $tooltip, false);
  });

  $('.claim, .tooltipModal').on('mouseleave', function(event) {
    // Get the element the mouse moved into
    const newTarget = event.relatedTarget;

    // Check if the new target is not .claim or .tooltipModal
    if (!$(newTarget).closest('.claim').length && !$(newTarget).closest('.tooltipModal').length) {
        // Hide the tooltip if the mouse is outside of .claim and .tooltipModal
        $('#tooltip').hide();
    }
  });

  // Event to update the tooltip position on mouse move
  $('.claim').mousemove(function(event) {
      const $tooltip = $('#tooltip');
      positionTooltip(event, $tooltip, true);
  });
}

function getClaimClass(label) {
  if (label.toUpperCase() === "TRUE") {
      return "fcllm-true";
  }
  else if (label.toUpperCase() === "MOSTLY TRUE"){
      return "fcllm-mostly-true"
  }
  else if (label.toUpperCase() === "FALSE"){
      return "fcllm-false"
  }
  else if (label.toUpperCase() === "MOSTLY FALSE"){
      return "fcllm-mostly-false"
  }
  else if (label.toUpperCase() === "NOT ENOUGH EVIDENCE"){
      return "fcllm-unsupported"
  }
  else {
      console.error("Unrecognized claim label: " + label)
      return "fcllm-unsupported"
  }
}

// Function to position the tooltip
function positionTooltip(event, $tooltip, positionUpdate) {
  const tooltipHeight = $tooltip.outerHeight()
  const tooltipWidth = $tooltip.outerWidth();
  const pageHeight = $(window).height();
  const pageWidth = $(window).width();

  // Determine if there's more space above or below the cursor
  let topPosition = event.pageY + 21;
  if (event.pageY + tooltipHeight + 350 > pageHeight) {
      // If not enough space below, position above the cursor
      topPosition = event.pageY - tooltipHeight - 21;
      $('.carat-top').hide()
      $('.carat-bottom').show()
  }
  else {
      $('.carat-top').show()
      $('.carat-bottom').hide()
  }

  // Determine if tooltip should shift horizontally to stay within page bounds
  let leftPosition = event.pageX - tooltipWidth / 2;
  if (leftPosition + tooltipWidth > pageWidth) {
      leftPosition = pageWidth - tooltipWidth - 15;
  } else if (leftPosition < 0) {
      leftPosition = 15;
  }

  // Apply the final calculated positions
  // Do not update y coord on mousemove
  if (positionUpdate === false) {
    $tooltip.css({
        top: topPosition,
        left: leftPosition
    });
  }
  else {
    $tooltip.css({
      left: leftPosition
    });
  }

  let caratPosition = event.pageX - leftPosition - 15;
  caratPosition = Math.min(caratPosition, tooltipWidth - 40 - 15 )
  caratPosition = Math.max(caratPosition, 15)

  $('.carat').css({
    left: caratPosition
  })
}


// Listen for messages from background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "processPassageResponse") {
    processPassageResponse(message.data); // Call the function with the passed data
    sendResponse({ status: "200" });
  }
  else if (message.action === 'apiCallStart') {
    $('#loadingSpinnerWrapper').addClass('open');
  }
  else if (message.action === 'apiCallComplete') {
    $('#loadingSpinnerWrapper').removeClass('open');
  }
  else if (message.action === "reset") {
    resetPage();
  }
});