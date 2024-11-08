# Start from the specified Jupyter notebook base image
FROM jupyter/minimal-notebook:python-3.10.10

# Switch to root to install packages
USER root

# Install Playwright and its dependencies
RUN pip install playwright && \
    playwright install && \
    playwright install-deps

# Set environment variables to make root the default user in Jupyter
ENV NB_USER=root
ENV NB_UID=0
ENV NB_GID=0

# Set the default command to start the notebook
CMD ["start-notebook.sh", "--NotebookApp.allow_root=True"]
