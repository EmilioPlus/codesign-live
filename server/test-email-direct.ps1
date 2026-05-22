$PROD_URL = "https://codesign-backend.onrender.com"
$TEST_EMAIL = "jaiberhiguita4@gmail.com"

Write-Host "`n=== Probando envio de email en produccion ===" -ForegroundColor Cyan

# 1. Health check
Write-Host "`n[1] Health check..." -ForegroundColor Yellow
$health = Invoke-RestMethod -Uri "$PROD_URL/api/health/email" -Method GET -TimeoutSec 30
Write-Host "   ok: $($health.ok)"
Write-Host "   provider: $($health.provider)"
Write-Host "   clientReady: $($health.clientReady)"
Write-Host "   apiKeyPrefix: $($health.apiKeyPrefix)"

# 2. Enviar email de prueba
Write-Host "`n[2] Enviando forgot-password a $TEST_EMAIL..." -ForegroundColor Yellow
try {
    $body = @{ email = $TEST_EMAIL } | ConvertTo-Json
    $response = Invoke-RestMethod -Uri "$PROD_URL/api/auth/forgot-password" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -TimeoutSec 30
    Write-Host "   Respuesta: $($response | ConvertTo-Json)" -ForegroundColor Green
} catch {
    Write-Host "   ERROR HTTP $($_.Exception.Response.StatusCode):" -ForegroundColor Red
    $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
    Write-Host "   $($reader.ReadToEnd())" -ForegroundColor Red
}

Write-Host "`n=== Revisa los Logs de Render para ver el error de Resend ===" -ForegroundColor Cyan
Write-Host "https://dashboard.render.com/web/srv-d7kn4shkh4rs73fairtg/logs`n" -ForegroundColor Gray
