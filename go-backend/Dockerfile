# Multi-stage build for smaller image size
FROM golang:1.21-alpine AS builder

# Install build dependencies
RUN apk add --no-cache git

# Set working directory
WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# Final stage
FROM python:3.11-alpine

# Install runtime dependencies
RUN apk add --no-cache ca-certificates

# Install Python dependencies
RUN pip3 install --no-cache-dir requests

# Create app user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Set working directory
WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/main .

# Copy scripts
COPY scripts ./scripts

# Create necessary directories
RUN mkdir -p storage/stock_uploads config && \
    chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Expose port
EXPOSE 5001

# Run the application
CMD ["./main"]

