# Use Python 3.10
FROM python:3.10-slim

# Set the working directory
WORKDIR /app

# Copy the requirements first (to cache them)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the code
COPY . .

# Run the app
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]