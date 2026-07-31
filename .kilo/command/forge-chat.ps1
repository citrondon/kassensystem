\ = 'fg-f6599d3f09344bfa8a3fd979d8207306'
\ = 'https://forge-gateway-api.fly.dev/v1'
\ = 'kimi-k3'

\ = @{
    'Content-Type'  = 'application/json'
    'Authorization' = 'Bearer ' + }

\ = @{
    model    =     messages = @( @{ role = 'user'; content = 'Hello!' } )
    stream   = \False
    thinking = \True
} | ConvertTo-Json -Depth 3

try {
    \ = Invoke-RestMethod -Uri (\ + '/chat/completions') -Method Post -Headers \ -Body \ -ContentType 'application/json'
    \.choices[0].message.content
}
catch {
    Write-Error ('Forge API request failed: ' + \)
}
