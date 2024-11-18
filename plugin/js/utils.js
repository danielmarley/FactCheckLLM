const factCheckLLMHost = "http://localhost:8080"

function postPassages(selectionText) {
  return POST(factCheckLLMHost + "/passage", {text: selectionText})
}

function postClaim(claim) {
  return POST(factCheckLLMHost + "/claim", {claim: claim})
}

function postFeedback(claimId, claim, context, feedback) {
  return POST(factCheckLLMHost + "/feedback", {id: claimId, claim: claim, context: context, feedback: feedback})
}

// Replace current claim for id with feedback check
function submitFeedback(id){
  $claimDiv = $(`#${id}`);

  const claim = $claimDiv.data('claim');
  const context = $claimDiv.data('context');
  const feedback = $claimDiv.prop("tagName").toLowerCase() === 'span' ? $('#tooltip input.feedbackForm').val() : $claimDiv.find(`input.feedbackForm`).val();

  $('#loadingSpinnerWrapper').addClass('open');
  postFeedback(id, claim, context, feedback).then(res => {
    console.log("Feedback response:")
    console.log(res)
    updateClaimContent(res);
  }).catch(err => {
    console.error("Error calling `/passages`: ", err)
  }).finally(() => {
    $('#loadingSpinnerWrapper').removeClass('open');
  })
}

function updateClaimContent(feedbackResponse){
  const {id, label, context, reply} = feedbackResponse;
  let $claimDiv = $(`#${id}`);
  const isTooltip = $(`#${id}`).prop("tagName").toLowerCase() === 'span';
  if (isTooltip){
    $claimDiv.data('reply', reply)
      .data('context', context)
      .data('label', label)
      .removeClass()
      .addClass('claim')
      .addClass(getClaimClass(label));

    $claimDiv = $('#tooltip');
  }
  else {
    $claimDiv.data('context', context);
  }


  $claimDiv.find('#labelContent')
    .removeClass()
    .addClass(getClaimClass(label))
    .text(label)
  $claimDiv.find('#reasoningBody')
    .text(reply)

  $claimDiv.find('input.feedbackForm').val('')
  $claimDiv.find('button').removeClass('selected')
  $claimDiv.find('.feedbackForm').addClass('hiddenVis')
}

// Styling function
function getClaimClass(label) {
  let strLabel = String(label);
  if (strLabel.toUpperCase() === "TRUE") {
      return "fcllm-true";
  }
  else if (strLabel.toUpperCase() === "MOSTLY TRUE"){
      return "fcllm-mostly-true"
  }
  else if (strLabel.toUpperCase() === "FALSE"){
      return "fcllm-false"
  }
  else if (strLabel.toUpperCase() === "MOSTLY FALSE"){
      return "fcllm-mostly-false"
  }
  else if (strLabel.toUpperCase() === "NOT ENOUGH EVIDENCE"){
      return "fcllm-unsupported"
  }
  else {
      console.error("Unrecognized claim label: " + strLabel)
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