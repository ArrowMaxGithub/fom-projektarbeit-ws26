FROM ghcr.io/astral-sh/uv:alpine3.23
 
COPY . /app
WORKDIR /app
 
EXPOSE 8000

CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--forwarded-allow-ips=*"]
