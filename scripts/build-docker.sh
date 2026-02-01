#!/bin/bash

# Multi-architecture Docker build script
# Supports: linux/amd64, linux/arm64, linux/arm/v7

set -e

echo "╔════════════════════════════════════════╗"
echo "║   Lampa Tracks - Docker Build        ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Default values
IMAGE_NAME="lampa-torrents-tracks"
VERSION="1.0.0"
PLATFORMS="linux/amd64,linux/arm64"
PUSH=false
REGISTRY="ghcr.io/pavelpikta"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --push)
      PUSH=true
      shift
      ;;
    --registry)
      REGISTRY="$2"
      shift 2
      ;;
    --platforms)
      PLATFORMS="$2"
      shift 2
      ;;
    --version)
      VERSION="$2"
      shift 2
      ;;
    --help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --platforms PLATFORMS    Comma-separated list of platforms (default: linux/amd64)"
      echo "                          Examples: linux/amd64,linux/arm64,linux/arm/v7"
      echo "  --version VERSION        Image version tag (default: 2.0.0)"
      echo "  --registry REGISTRY      Docker registry (e.g., docker.io/username)"
      echo "  --push                   Push image to registry after build"
      echo "  --help                   Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0                                    # Build for amd64 only"
      echo "  $0 --platforms linux/arm64            # Build for arm64"
      echo "  $0 --platforms linux/amd64,linux/arm64  # Multi-arch build"
      echo "  $0 --registry myregistry.com/user --push  # Build and push"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Build full image name
if [ -n "$REGISTRY" ]; then
  FULL_IMAGE_NAME="${REGISTRY}/${IMAGE_NAME}"
else
  FULL_IMAGE_NAME="${IMAGE_NAME}"
fi

echo "Configuration:"
echo "  Image: ${FULL_IMAGE_NAME}:${VERSION}"
echo "  Platforms: ${PLATFORMS}"
echo "  Push: ${PUSH}"
echo ""

# Check if buildx is available
if ! docker buildx version &> /dev/null; then
  echo "Error: docker buildx is not available"
  echo "Please update Docker to a version that supports buildx"
  exit 1
fi

# Create or use builder instance
BUILDER_NAME="lampa-torrents-tracks-builder"
if ! docker buildx inspect $BUILDER_NAME &> /dev/null; then
  echo "Creating buildx builder: $BUILDER_NAME"
  docker buildx create --name $BUILDER_NAME --use
else
  echo "Using existing buildx builder: $BUILDER_NAME"
  docker buildx use $BUILDER_NAME
fi

# Build command
BUILD_CMD="docker buildx build"
BUILD_CMD="$BUILD_CMD --platform ${PLATFORMS}"
BUILD_CMD="$BUILD_CMD --tag ${FULL_IMAGE_NAME}:${VERSION}"
BUILD_CMD="$BUILD_CMD --tag ${FULL_IMAGE_NAME}:latest"

if [ "$PUSH" = true ]; then
  BUILD_CMD="$BUILD_CMD --push"
else
  BUILD_CMD="$BUILD_CMD --load"
fi

BUILD_CMD="$BUILD_CMD ."

echo "Building image..."
echo "Command: $BUILD_CMD"
echo ""

eval $BUILD_CMD

if [ $? -eq 0 ]; then
  echo ""
  echo "╔════════════════════════════════════════╗"
  echo "║         Build Successful!             ║"
  echo "╚════════════════════════════════════════╝"
  echo ""
  echo "Image: ${FULL_IMAGE_NAME}:${VERSION}"
  echo "Platforms: ${PLATFORMS}"

  if [ "$PUSH" = true ]; then
    echo "Status: Pushed to registry"
  else
    echo "Status: Available locally"
    echo ""
    echo "Run with:"
    echo "  docker run -p 3000:3000 ${FULL_IMAGE_NAME}:${VERSION}"
    echo ""
    echo "Or use docker-compose:"
    echo "  docker-compose up -d"
  fi
else
  echo ""
  echo "Build failed!"
  exit 1
fi
