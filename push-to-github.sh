#!/bin/bash
# Push script for GitHub repository

echo "📤 Pushing to GitHub..."
echo ""
echo "Repository: https://github.com/devwyshkit/orchids-wyshkit"
echo ""
echo "Please ensure:"
echo "  1. The repository exists on GitHub"
echo "  2. You have write access to it"
echo "  3. The token has 'repo' scope enabled"
echo ""
echo "Using token for authentication..."
git push -u origin main
