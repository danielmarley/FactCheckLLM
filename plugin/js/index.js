factCheckLLMHost = "http://localhost:8080"

// TODO: Add claim review/context mechanism

// Register events on page (not allowed to inline by Chrome)
$(document).ready(function() {
  $('#submit-claim').on("click", submitClaim) 
});

function submitClaim() {
  const claim = document.getElementById('claim-input').value;

  let resPromise = POST(factCheckLLMHost + "/claim", {claim: claim})
  $('#loadingSpinnerWrapper').addClass('open')

    // Update page based on response
    resPromise.then((res) => {
      $("#claim-input").val(""); 
      console.log("Claim completed successfully.");
      console.log(res)

      const labelClass = getClaimClass(res.label);

      const claimId = String(Math.floor(Math.random() * 1000000));
      $(`<div id="${claimId}" class="claim-content">
        <h2 id="claim">Claim: <span id="claimContent">${claim}</span></h2>
        <h3 id="label">Label: <span id="labelContent" class='${labelClass}'>${res.label}</span></h2> 
        <h4 id="reasoningHeader">Explained Response: </h4>
        <p id="reasoningBody">${res.reply}</p>
        <div class="feedbackWrap">
          <div class="input-container">
            <input type="text" id="feedback-input" class="fcllm-input hiddenVis feedbackForm" placeholder="Add additional context to improve response">
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
        </div>
      </div>`).appendTo('#claimResponses')
      $(`#${claimId}`).data('claim', res.claim);
      $(`#${claimId}`).data('context', res.context);

      $(`#${claimId} .rating-button-up`).on('click', (ev) => {
        $(`#${claimId} .rating-button-down`).removeClass('selected')
        $(`#${claimId} .rating-button-up`).addClass('selected')
        $(`#${claimId} .feedbackForm`).addClass('hiddenVis')
      });

      $(`#${claimId} .rating-button-down`).on('click', (ev) => {
        $(`#${claimId} .rating-button-down`).addClass('selected')
        $(`#${claimId} .rating-button-up`).removeClass('selected')
        $(`#${claimId} .feedbackForm`).removeClass('hiddenVis')
      });

      $(`#${claimId} .submit-feedback`).on('click', (ev) => {
        submitFeedback(claimId)
      });
    }).catch(err => {
      console.error("Error calling `/claim`: ", err)
    }).finally(() => {
      $('#loadingSpinnerWrapper').removeClass('open')
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