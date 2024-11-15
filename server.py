from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from factExtraction import extractClaimsLLM
from factCheck import factCheckSingleClaim
import uvicorn

# Initialize FastAPI app
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow specific origins
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)

# Request body schema
class PassageRequestBody(BaseModel):
    text: str

# Request body schema
class ClaimRequestBody(BaseModel):
    claim: str
    
# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "ok"}
    
# API endpoint to generate response for single claim
@app.post("/claim/")
async def generate_response(request_body: ClaimRequestBody):
    print("NEW CLAIM: \n" + request_body.claim)
    res = await factCheckSingleClaim(request_body.claim);
    res['claim'] = request_body.claim;
    print("Returning claim to client...") 
    return res
    
# API endpoint to generate response for text passage
@app.post("/passage/")
async def generate_response(request_body: PassageRequestBody):
    print("NEW PASSAGE: \n" + request_body.text)
    parsed_claims = extractClaimsLLM(request_body.text)
    
    print("PARSED PASSAGE: \n") 
    print(parsed_claims)
    
    # TO DO: batch claims, also join wait for futures and update claimStructs more efficiently 
    for claimStruct in parsed_claims:
        print(claimStruct)
        print(claimStruct['claim'])
        res = await factCheckSingleClaim(claimStruct['claim']);
        claimStruct.update(res);
    
    print("Returning passages to client...") 
    return parsed_claims

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)  # Use 0.0.0.0 to allow external access