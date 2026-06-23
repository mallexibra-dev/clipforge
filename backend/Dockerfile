FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
      ca-certificates \
      libglib2.0-0 \
      libgl1 \
      libgomp1 \
      fontconfig \
      fonts-dejavu-core \
      fonts-dejavu \
      fonts-liberation \
      fonts-noto-core \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN python -m pip install --upgrade pip \
    && python -m pip install -r requirements.txt

COPY . .

RUN mkdir -p outputs

EXPOSE 8010

CMD ["python", "-m", "uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8010"]
