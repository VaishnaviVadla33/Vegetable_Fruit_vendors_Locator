# Use an official AWS Lambda Python base image
FROM public.ecr.aws/lambda/python:3.12

# Install system dependencies for building Python packages
RUN dnf install -y gcc gcc-c++ make python3-devel

# Copy requirements file to Lambda task root
COPY requirements.txt ${LAMBDA_TASK_ROOT}

# FIRST: Install CPU-only PyTorch before anything else
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# THEN: Install other dependencies (they will use the existing torch)
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your application code into Lambda task root
COPY app.py ${LAMBDA_TASK_ROOT}
COPY firebase-credentials.json ${LAMBDA_TASK_ROOT}

# Set the command that Lambda will run when invoked
CMD ["app.lambda_handler"]