// Insert tooltip on page load
$(document).ready(function() {
  $(`<link rel="preconnect" href="https://fonts.googleapis.com">`).appendTo('head');
  $(`<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`).appendTo('head');
  $(`<link href="https://fonts.googleapis.com/css2?family=Funnel+Display:wght@300..800&display=swap" rel="stylesheet">`).appendTo('head');

  // Create the tooltip modal element
  $(`<div class='tooltipModal' id="tooltip">
      <div class="carat carat-top tooltipModal"></div>
      <div id="tooltip-content">
        <h2 id="claim">Claim: <span id="claimContent"></span></h2>
        <h3 id="label">Label: <span id="labelContent"></span></h2> 
        <h4 id="reasoningHeader">Explained Response: </h4>
        <p id="reasoningBody"></p>
        <div class="feedbackWrap">
          <div class="input-container">
            <input type="text" id="feedback-input" class="fcllm-input hiddenVis feedbackForm" placeholder="Add additional context">
            <button type="submit" class="submit-feedback hiddenVis feedbackForm">GO</button>
          
            <button class="rating-button-up">
              <svg class="thumb-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M1 21h4V9H1v12zM23 11c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L13.17 2 7.59 7.59C7.21 7.98 7 8.49 7 9v10c0 1.1.9 2 2 2h8c.78 0 1.48-.45 1.84-1.13l3.02-5.53c.09-.18.14-.38.14-.59v-2z"/>
              </svg>
            </button>

            <button class="rating-button-down">
              <svg class="thumb-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M1 3h4v12H1V3zm22 10c0 1.1-.9 2-2 2h-6.31l.95 4.57.03.32c0 .41-.17.79-.44 1.06L13.17 22 7.59 16.41C7.21 16.02 7 15.51 7 15V5c0-1.1.9-2 2-2h8c.78 0 1.48.45 1.84 1.13l3.02 5.53c.09.18.14.38.14.59v2z"/>
              </svg>
            </button>
          </div>
        <div id="credits">Powered by FactCheckLLM</div>
      </div>
      <div class="carat carat-bottom tooltipModal"></div>
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
        $(`#tooltip .rating-button-down`).removeClass('selected')
        $(`#tooltip .rating-button-up`).removeClass('selected')
        $(`#tooltip .feedbackForm`).addClass('hiddenVis')
        $(`#tooltip input.feedbackForm`).val('')
    }
  });

  $(`#tooltip .rating-button-up`).on('click', (ev) => {
    $(`#tooltip .rating-button-down`).removeClass('selected')
    $(`#tooltip .rating-button-up`).addClass('selected')
    $(`#tooltip .feedbackForm`).addClass('hiddenVis')
  });

  $(`#tooltip .rating-button-down`).on('click', (ev) => {
    $(`#tooltip .rating-button-down`).addClass('selected')
    $(`#tooltip .rating-button-up`).removeClass('selected')
    $(`#tooltip .feedbackForm`).removeClass('hiddenVis')
  });

  $(`#tooltip .submit-feedback`).on('click', (ev) => {
    submitFeedback($('#tooltip').data('id'))
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

function submitPassageRequest(selectionText) {
  $('#loadingSpinnerWrapper').addClass('open');
  postPassages(selectionText).then((res) => { 
    console.log('Passages response: ')
    console.log(res)
    processPassageResponse(res);
  }).catch(err => {
    console.error("Error calling `/passages`: ", err)
  }).finally(() => {
    $('#loadingSpinnerWrapper').removeClass('open');
  })
}

// Add a custom case-insensitive contains selector
jQuery.expr[':'].icontains = function(elem, index, match) {
  return jQuery(elem).text().toLowerCase().indexOf(match[3].toLowerCase()) >= 0;
};

// Process new passage request for LLM API
function processPassageResponse(excerptsWithClaims) {
  resetPage();
  const parentDivs = [];
  const parentIndexToClaimsMap = {};

  // Get all divs that contain excerpts
  // Create map for parentDiv to claim indexes
  excerptsWithClaims.forEach((item, itemIndex) => {
    const { excerpt } = item;
    const claimDiv = $(`*:icontains(${normalizeQuotes(excerpt)})`) // TODO handle nbsp
      .not('script')
      .not('head')
      .not('link')
      .last();

    // Error case where text cannot be found on page (LLM can change a word in the excerpt occassionally as an error)
    // Simply skip this excerpt
    if (claimDiv == undefined || claimDiv[0] == undefined){
      return;
    }
    
    if (parentDivs.includes(claimDiv[0])){
      let key = parentDivs.indexOf(claimDiv[0])
      parentIndexToClaimsMap[key].push(itemIndex) 
    }
    else {
      parentDivs.push(claimDiv[0])
      let key = parentDivs.length - 1;
      parentIndexToClaimsMap[key] = [itemIndex];
    }
  });

  // Per containing div, perform all text replacements in batch
  parentDivs.forEach((excerptDiv, divIndex) => {
    const textContent = excerptDiv.textContent;
    let replacementContent = textContent; //textContent.replaceAll(String.fromCharCode([160]), ' ');

    const claimIndexes = parentIndexToClaimsMap[divIndex];

    const uuids = []
    for (var idx in claimIndexes) {
      const { excerpt, claim, context, label, reply } = excerptsWithClaims[idx];
      const claimClass = getClaimClass(label);
      const claimId = String(Math.floor(Math.random() * 1000000));
      const highlightHTML = `
        <span id='${claimId}' class="claim ${claimClass}" data-label="${label}">
          ${excerpt}
        </span>
      `;
      replacementContent = replacementContent.replace(excerpt, highlightHTML)
      uuids.push(claimId);
    }
    const $excerptDiv = $(excerptDiv);
    $excerptDiv.attr('data-factcheckuntouched', textContent)
    $excerptDiv.html(replacementContent);

    claimIndexes.forEach((element, idx) => {
      const claimId = uuids[idx];
      const { excerpt, claim, context, label, reply } = excerptsWithClaims[element];
      $(`#${claimId}`).data('reply', reply)
        .data('excerpt', excerpt)
        .data('claim', claim)
        .data('context', context);
    });
  });

  $('.claim').on('mouseenter', function(event) {
    const $tooltip = $('#tooltip');
    // Set the tooltip content
    const label = $(this).data('label')

    $tooltip.data('id', $(this).attr("id"));
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

function normalizeQuotes(input) {
  return input.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
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


// Listen for messages from background.js/the context menu
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "newPassageRequest") {
    submitPassageRequest(message.data);
  }
  else if (message.action === "reset") {
    resetPage();
  }
});