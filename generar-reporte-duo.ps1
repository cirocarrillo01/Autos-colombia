
# generar-reporte-duo.ps1
# Uso: .\generar-reporte-duo.ps1
#
# Genera dos reportes independientes:
# - reporte-frontend.txt
# - reporte-backend.txt
#
# Copiar reportes:
# Get-Content reporte-frontend.txt -Raw | Set-Clipboard
# Get-Content reporte-backend.txt -Raw | Set-Clipboard

$rootPath = $PWD.Path

# Carpetas principales
$frontendPath = Join-Path $rootPath "frontend"
$backendPath  = Join-Path $rootPath "backend"

# Carpetas a ignorar
$excludeDirs = @(
    'node_modules',
    '.git',
    'dist',
    'build',
    '.vite',
    'coverage',
    '.next',
    'documentacion'
)

# Archivos a ignorar
$excludeFiles = @(
    '.env',
    '.env.local',
    '.env.production',
    'package-lock.json',
    'yarn.lock',
    'reporte.txt',
    'reporte-frontend.txt',
    'reporte-backend.txt'
)

# Extensiones a incluir
$includeExtensions = @(
    '.js',
    '.jsx',
    '.ts',
    '.tsx',
    '.json',
    '.css',
    '.html',
    '.md',
    '.env.example'
)

function Test-Excluded {
    param($path)

    foreach ($dir in $excludeDirs) {
        if ($path -match "[\\/]$([regex]::Escape($dir))([\\/]|$)") {
            return $true
        }
    }

    $name = Split-Path $path -Leaf

    if ($excludeFiles -contains $name) {
        return $true
    }

    return $false
}

function Generate-Report {
    param(
        [string]$projectPath,
        [string]$projectName,
        [string]$outputName
    )

    if (!(Test-Path $projectPath -PathType Container)) {
        Write-Host "Carpeta no encontrada: $projectPath" -ForegroundColor Yellow
        return
    }

    $outputFile = Join-Path $rootPath $outputName

    # Archivos del proyecto
    $files = Get-ChildItem -Recurse -File $projectPath |
        Where-Object {
            -not (Test-Excluded $_.FullName)
        }

    # Crear reporte
    "" | Out-File $outputFile -Encoding UTF8

    # Encabezado
    Add-Content $outputFile "=========================================="
    Add-Content $outputFile "REPORTE $projectName"
    Add-Content $outputFile "Generado: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    Add-Content $outputFile "Raíz: $projectPath"
    Add-Content $outputFile "=========================================="
    Add-Content $outputFile ""

    # 1. ÁRBOL DE DIRECTORIOS
    Add-Content $outputFile "=========================================="
    Add-Content $outputFile "ÁRBOL DE DIRECTORIOS"
    Add-Content $outputFile "=========================================="
    Add-Content $outputFile ""

    foreach ($file in $files) {
        $rel = $file.FullName.Substring($projectPath.Length).TrimStart('\', '/')
        Add-Content $outputFile $rel
    }

    # 2. CONTENIDO DE ARCHIVOS
    Add-Content $outputFile ""
    Add-Content $outputFile "=========================================="
    Add-Content $outputFile "CONTENIDO DE ARCHIVOS"
    Add-Content $outputFile "=========================================="
    Add-Content $outputFile ""

    $files | Where-Object {
        $includeExtensions.Count -eq 0 -or
        $includeExtensions -contains $_.Extension
    } | ForEach-Object {

        $rel = $_.FullName.Substring($projectPath.Length).TrimStart('\', '/')

        Add-Content $outputFile ""
        Add-Content $outputFile "//=========================================="
        Add-Content $outputFile "// FILE: $rel"
        Add-Content $outputFile "//=========================================="

        try {
            Get-Content $_.FullName -Raw -Encoding UTF8 |
                Add-Content $outputFile
        }
        catch {
            Add-Content $outputFile "[ERROR leyendo archivo: $_]"
        }

        Add-Content $outputFile ""
        Add-Content $outputFile ""
    }

    # Resultado
    $size = [math]::Round(
        (Get-Item $outputFile).Length / 1KB, 2
    )

    Write-Host ""
    Write-Host "Reporte generado: $outputFile" -ForegroundColor Green
    Write-Host "Archivos: $($files.Count)" -ForegroundColor Cyan
    Write-Host "Tamaño: $size KB" -ForegroundColor Cyan
}

# GENERAR FRONTEND
Generate-Report `
    -projectPath $frontendPath `
    -projectName "FRONTEND" `
    -outputName "reporte-frontend.txt"

# GENERAR BACKEND
Generate-Report `
    -projectPath $backendPath `
    -projectName "BACKEND" `
    -outputName "reporte-backend.txt"

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "REPORTES GENERADOS" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host "Frontend: reporte-frontend.txt"
Write-Host "Backend:  reporte-backend.txt"
Write-Host ""
