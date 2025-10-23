# Step 1: Use an official Python 3.12 slim image
FROM python:3.12-slim

# Step 2: Set a working directory
WORKDIR /app

# Step 3: Install uv using pip. This is the simplest and most reliable method.
# This ensures `uv` and `uvx` are on the system PATH for subsequent commands.
RUN pip install uv

# Step 4: Copy only the pyproject.toml file
# This leverages Docker's layer caching for dependencies.
COPY pyproject.toml .

# Step 5: Install dependencies using the newly installed uv
RUN uv pip install --system -r pyproject.toml

# Step 6: Copy the rest of your application code
COPY . .

# Step 7: Expose the langgraph server port
EXPOSE 8000

# Step 8: Define the command to run your app
# The command remains the same, as `uvx` is now correctly on the PATH.
CMD ["uvx", "--from", "langgraph-cli[inmem]", "--with-editable", ".", "langgraph", "dev", "--host", "0.0.0.0", "--port", "8012", "--allow-blocking"]