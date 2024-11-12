from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from factExtraction import extractClaimsLLM
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
class RequestBody(BaseModel):
    text: str

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "ok"}
    
# API endpoint to generate response for single claim
@app.post("/single-claim/")
async def generate_response(request_body: RequestBody):
    return {"response": "Not implemented yet"}
    
# API endpoint to generate response for text passage
@app.post("/passage/")
async def generate_response(request_body: RequestBody):
    # print(request_body.text)
    result = extractClaimsLLM(request_body.text)
    return result

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8080)  # Use 0.0.0.0 to allow external access