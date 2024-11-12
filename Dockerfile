# Start from the specified Jupyter notebook base image
FROM jupyter/minimal-notebook:python-3.10.10

# Switch to root to install packages
USER root

# Install apt-get packages
RUN apt-get update -y && \
    apt-get install -y wget curl unzip && \
    apt-get install -y libx11-dev libxcomposite-dev libxdamage-dev libxrandr-dev libgbm-dev libgtk-3-dev

# Install Playwright and its dependencies
RUN pip install playwright && \
    playwright install && \
    playwright install-deps && \
    playwright install chromium

# Set environment variables to make root the default user in Jupyter
ENV NB_USER=root
ENV NB_UID=0
ENV NB_GID=0

# Set the default command to start the notebook
CMD ["start-notebook.sh", "--NotebookApp.allow_root=True"]
