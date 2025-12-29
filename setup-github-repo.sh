#!/bin/bash
# GitHub Repository Setup Script for orchids-wyshkit

GITHUB_USERNAME="${1:-YOUR_USERNAME}"
REPO_NAME="orchids-wyshkit"

if [ "$GITHUB_USERNAME" = "YOUR_USERNAME" ]; then
    echo "❌ Please provide your GitHub username:"
    echo "   Usage: ./setup-github-repo.sh YOUR_USERNAME"
    echo ""
    echo "Or set it manually:"
    echo "   git remote add origin https://github.com/YOUR_USERNAME/orchids-wyshkit.git"
    echo "   git push -u origin main"
    exit 1
fi

echo "🔗 Adding GitHub remote..."
git remote add origin "https://github.com/${GITHUB_USERNAME}/${REPO_NAME}.git"

echo "📤 Pushing to GitHub..."
git push -u origin main

echo "✅ Repository connected successfully!"
echo "🌐 View at: https://github.com/${GITHUB_USERNAME}/${REPO_NAME}"
