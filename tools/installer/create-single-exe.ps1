param(
    [string]$PublishDir = (Join-Path $PSScriptRoot "RiskcareSetup\bin\Release\net8.0-windows\win-x64\publish"),
    [string]$StubName = "RiskcareSetup.exe",
    [string]$PayloadName = "riskcare-app.zip",
    [string]$OutputName = "RiskcareSetup-OneFile.exe"
)

$ErrorActionPreference = "Stop"

$marker = "RISKCARE_PAYLOAD_V1"
$markerBytes = [System.Text.Encoding]::ASCII.GetBytes($marker)

$stubPath = Join-Path $PublishDir $StubName
$payloadPath = Join-Path $PublishDir $PayloadName
$outputPath = Join-Path $PublishDir $OutputName

if (-not (Test-Path $stubPath)) {
    throw "No existe el ejecutable base: $stubPath"
}

if (-not (Test-Path $payloadPath)) {
    throw "No existe el payload ZIP: $payloadPath"
}

if ([System.IO.Path]::GetFullPath($stubPath) -eq [System.IO.Path]::GetFullPath($outputPath)) {
    throw "El archivo de salida no puede ser el mismo que el ejecutable base."
}

$payloadInfo = Get-Item $payloadPath
$lengthBytes = [System.BitConverter]::GetBytes([Int64]$payloadInfo.Length)

$outputStream = [System.IO.File]::Open($outputPath, [System.IO.FileMode]::Create, [System.IO.FileAccess]::Write, [System.IO.FileShare]::None)
try {
    $stubStream = [System.IO.File]::OpenRead($stubPath)
    try {
        $stubStream.CopyTo($outputStream)
    }
    finally {
        $stubStream.Dispose()
    }

    $payloadStream = [System.IO.File]::OpenRead($payloadPath)
    try {
        $payloadStream.CopyTo($outputStream)
    }
    finally {
        $payloadStream.Dispose()
    }

    $outputStream.Write($markerBytes, 0, $markerBytes.Length)
    $outputStream.Write($lengthBytes, 0, $lengthBytes.Length)
}
finally {
    $outputStream.Dispose()
}

$outputInfo = Get-Item $outputPath
Write-Host "Generado instalador unico:"
Write-Host " - $outputPath"
Write-Host ("Tamano: {0:N0} bytes" -f $outputInfo.Length)
