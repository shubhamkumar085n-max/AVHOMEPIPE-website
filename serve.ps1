# Simple PowerShell Web Server for serving static files
$port = 8080
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
    Write-Host "Server started successfully."
    Write-Host "Local Host Link: http://localhost:$port/"
    Write-Host "Press Ctrl+C to stop the server."
    
    while ($listener.IsListening) {
        try {
            $context = $listener.GetContext()
            $request = $context.Request
            $response = $context.Response
            
            $urlPath = $request.Url.LocalPath
            if ($urlPath -eq "/") { $urlPath = "/index.html" }
            
            # Build local path
            $filePath = Join-Path (Get-Location) $urlPath
            $filePath = $filePath.Replace("/", "\")
            
            # If not found in root, fallback to public directory
            if (!(Test-Path $filePath -PathType Leaf)) {
                $publicPath = Join-Path (Get-Location) "public$urlPath"
                $publicPath = $publicPath.Replace("/", "\")
                if (Test-Path $publicPath -PathType Leaf) {
                    $filePath = $publicPath
                }
            }
            
            if (Test-Path $filePath -PathType Leaf) {
                $bytes = [System.IO.File]::ReadAllBytes($filePath)
                
                # Determine Content-Type
                $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                $mime = "application/octet-stream"
                if ($ext -eq ".html") { $mime = "text/html" }
                elseif ($ext -eq ".css") { $mime = "text/css" }
                elseif ($ext -eq ".js") { $mime = "application/javascript" }
                elseif ($ext -eq ".jpg" -or $ext -eq ".jpeg") { $mime = "image/jpeg" }
                elseif ($ext -eq ".png") { $mime = "image/png" }
                elseif ($ext -eq ".svg") { $mime = "image/svg+xml" }
                
                $response.ContentType = $mime
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $response.StatusCode = 404
                $err = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $urlPath")
                $response.ContentLength64 = $err.Length
                $response.OutputStream.Write($err, 0, $err.Length)
            }
            $response.Close()
        } catch {
            Write-Warning "Request error: $_"
            if ($null -ne $response) {
                try { $response.Close() } catch {}
            }
        }
    }
} catch {
    Write-Error $_.Exception.Message
} finally {
    $listener.Stop()
}
