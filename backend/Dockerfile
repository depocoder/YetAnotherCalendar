FROM python:3.13.7-slim-trixie as prod

# instal uv
COPY --from=ghcr.io/astral-sh/uv:0.6.5 /uv /uvx /bin/

# Enable bytecode compilation
# Copy from the cache instead of linking since it's a mounted volume
# Use the system Python environment
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy UV_PROJECT_ENVIRONMENT="/usr/local/"

# Add the project's dependencies to the image
COPY pyproject.toml uv.lock /app/src/

# Install the project's dependencies using the lockfile and settings
RUN --mount=type=cache,target=/root/.cache/uv \
    --mount=type=bind,source=uv.lock,target=uv.lock \
    --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
    uv sync --frozen

# Copying requirements of a project
WORKDIR /app/src

# Copying actuall application
COPY . /app/src/

CMD ["/usr/local/bin/python", "-m", "yet_another_calendar"]
