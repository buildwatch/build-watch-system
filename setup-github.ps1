# Build Watch System - GitHub Setup Script
# Run this script after creating your GitHub repository

Write-Host "🚀 Build Watch System - GitHub Setup" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

# Get GitHub username
$githubUsername = Read-Host "Enter your GitHub username"

if (-not $githubUsername) {
    Write-Host "❌ GitHub username is required!" -ForegroundColor Red
    exit 1
}

# Add GitHub remote
Write-Host "📡 Adding GitHub remote..." -ForegroundColor Yellow
git remote add origin "https://github.com/$githubUsername/build-watch-system.git"

# Push to GitHub
Write-Host "📤 Pushing to GitHub..." -ForegroundColor Yellow
git push -u origin main

Write-Host "✅ Successfully pushed to GitHub!" -ForegroundColor Green
Write-Host ""
Write-Host "🎯 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Go to https://railway.app" -ForegroundColor White
Write-Host "2. Sign up with GitHub" -ForegroundColor White
Write-Host "3. Click 'New Project'" -ForegroundColor White
Write-Host "4. Select 'Deploy from GitHub repo'" -ForegroundColor White
Write-Host "5. Choose your build-watch-system repository" -ForegroundColor White
Write-Host ""
Write-Host "📖 See DEPLOYMENT.md for detailed instructions" -ForegroundColor Cyan 