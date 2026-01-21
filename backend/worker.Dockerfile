FROM python:3.11-slim

WORKDIR /src
COPY requirements.txt /src/requirements.txt
RUN pip install --no-cache-dir -r /src/requirements.txt

COPY app /src/app

ENV PYTHONUNBUFFERED=1
CMD ["python", "-m", "app.policies.worker"]
