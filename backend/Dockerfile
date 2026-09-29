FROM ghcr.io/astral-sh/uv:alpine3.23
 
COPY . /app
WORKDIR /app
 
EXPOSE 8000
CMD ["uv", "run", "fastapi", "run", "main.py", "--forwarded-allow-ips=*"]
