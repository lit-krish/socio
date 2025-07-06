Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "   SocialConnect Platform" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "🚀 Starting the server..." -ForegroundColor Green
Write-Host ""

# Change to script directory
Set-Location $PSScriptRoot

# Start the server
node server.js

Write-Host ""
Write-Host "Server stopped." -ForegroundColor Yellow
Read-Host "Press Enter to exit"