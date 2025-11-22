#!/bin/bash
# Setup uploads directory structure
# Run: bash scripts/setup-uploads-directory.sh

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
UPLOADS_DIR="$BACKEND_DIR/uploads"

echo "🔧 Setting up uploads directory structure..."
echo "Backend directory: $BACKEND_DIR"
echo "Uploads directory: $UPLOADS_DIR"
echo ""

# Create main uploads directory
mkdir -p "$UPLOADS_DIR"
echo "✅ Created: $UPLOADS_DIR"

# Create subdirectories
mkdir -p "$UPLOADS_DIR/profile-pictures"
echo "✅ Created: $UPLOADS_DIR/profile-pictures"

mkdir -p "$UPLOADS_DIR/announcements"
echo "✅ Created: $UPLOADS_DIR/announcements"

mkdir -p "$UPLOADS_DIR/rpmes-forms"
echo "✅ Created: $UPLOADS_DIR/rpmes-forms"

mkdir -p "$UPLOADS_DIR/milestone-evidence"
echo "✅ Created: $UPLOADS_DIR/milestone-evidence"

mkdir -p "$UPLOADS_DIR/project-documents"
echo "✅ Created: $UPLOADS_DIR/project-documents"

# Set permissions (adjust user/group as needed)
# Assuming the backend runs as the current user or a specific user
if [ -n "$SUDO_USER" ]; then
  chown -R $SUDO_USER:$SUDO_USER "$UPLOADS_DIR"
  echo "✅ Set ownership to $SUDO_USER"
elif [ -n "$USER" ]; then
  chown -R $USER:$USER "$UPLOADS_DIR"
  echo "✅ Set ownership to $USER"
fi

chmod -R 755 "$UPLOADS_DIR"
echo "✅ Set permissions to 755"

echo ""
echo "✅ Uploads directory structure created successfully!"
echo ""
echo "📋 Directory structure:"
ls -la "$UPLOADS_DIR"
echo ""
echo "💡 Next steps:"
echo "   1. Verify backend can write to these directories"
echo "   2. Check backend .env file for any upload path configurations"
echo "   3. Restart backend: pm2 restart buildwatch-backend"

