from fastapi import FastAPI

app = FastAPI(
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)


@app.get("/api/hello")
async def root():
    return {"message": "Hello World"}
