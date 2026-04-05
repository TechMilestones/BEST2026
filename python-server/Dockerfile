# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Set environment variables for better Python execution in Docker
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHON_SERVICE_PORT=8888

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container
COPY requirements.txt .

# Install dependencies using cache mount for pip
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose port 8888
EXPOSE 8888

# Run server.py when the container launches
CMD ["python", "server.py"]
