FROM python:3.11-slim

WORKDIR /src
COPY requirements.txt /src/requirements.txt
RUN pip install --no-cache-dir -r /src/requirements.txt

COPY app /src/app
COPY alembic.ini /src/alembic.ini
COPY alembic /src/alembic
COPY grid_points.csv /src/grid_points.csv

ENV PYTHONUNBUFFERED=1
EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
