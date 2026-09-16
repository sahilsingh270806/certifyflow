# Production Dockerfile for CertifyFlow Web Application
FROM python:3.11-slim

WORKDIR /app

# Copy application files
COPY . /app

# Ensure non-root execution for security
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

# Expose standard web port
EXPOSE 8080

ENV PORT=8080
ENV PYTHONUNBUFFERED=1

CMD ["python", "execution/serve.py"]
