factCheckLLMHost = "http://localhost:8080"

// TODO: Add claim review/context mechanism

$(document).ready(function() {
  $('#submit-claim').on("click", submitClaim) 
});

function submitClaim() {
  const claim = document.getElementById('claim-input').value;

  let resPromise = POST(factCheckLLMHost + "/claim", {claim: claim})
  $('#loadingSpinnerWrapper').addClass('open')

    // Update page based on response
    resPromise.then((res) => {
      console.log("Claim completed successfully.");
      console.log(res)

      const labelClass = getClaimClass(res.label);

      $(`<div id="claim-content">
        <h2 id="claim">Claim: <span id="claimContent">${claim}</span></h2>
        <h3 id="label">Label: <span id="labelContent" class='${labelClass}'>${res.label}</span></h2> 
        <h4 id="reasoningHeader">Explained Response: </h4>
        <p id="reasoningBody">${res.reply}</p>
      </div>`).appendTo('#claimResponse')
    }).catch(err => {
      console.error("Error calling `/claim`: ", err)
    }).finally(() => {
      $('#loadingSpinnerWrapper').removeClass('open')
    });
}

function getClaimClass(label) {
  if (label.toUpperCase() === "TRUE") {
      return "true";
  }
  else if (label.toUpperCase() === "MOSTLY TRUE"){
      return "mostly-true"
  }
  else if (label.toUpperCase() === "FALSE"){
      return "false"
  }
  else if (label.toUpperCase() === "MOSTLY FALSE"){
      return "mostly-false"
  }
  else if (label.toUpperCase() === "NOT ENOUGH EVIDENCE"){
      return "unsupported"
  }
  else {
      console.error("Unrecognized claim label: " + label)
      return "unsupported"
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