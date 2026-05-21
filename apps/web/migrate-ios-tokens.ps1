# Bulk replace --ios-* CSS variables with enterprise tokens
# across all .tsx files in the dashboard directory

$dashboardPath = Join-Path $PSScriptRoot "src\app\dashboard"
$files = Get-ChildItem -Path $dashboardPath -Recurse -Filter "*.tsx"

$replacements = @{
    'var(--ios-blue)'    = 'var(--primary)'
    'var(--ios-red)'     = 'var(--destructive)'
    'var(--ios-green)'   = 'var(--erp-success)'
    'var(--ios-orange)'  = 'var(--erp-warning)'
    'var(--ios-purple)'  = 'var(--chart-4)'
    'var(--ios-indigo)'  = 'var(--chart-5)'
    'var(--ios-gray3)'   = 'var(--muted-foreground)'
    'var(--ios-teal, #5AC8FA)' = 'var(--chart-3)'
    'var(--ios-teal)'    = 'var(--chart-3)'
}

$labelReplacements = @{
    'var(--label-primary)'    = 'var(--foreground)'
    'var(--label-secondary)'  = 'var(--muted-foreground)'
    'var(--label-tertiary)'   = 'var(--muted-foreground)'
    'var(--label-quaternary)' = 'var(--muted-foreground)'
    'var(--fill-tertiary)'    = 'var(--muted)'
    'var(--fill-quaternary)'  = 'var(--muted)'
    'var(--fill-secondary)'   = 'var(--accent)'
    'var(--border-card)'      = 'var(--border)'
    'var(--border-subtle)'    = 'var(--border)'
    'var(--bg-card)'          = 'var(--card)'
    'var(--bg-page)'          = 'var(--background)'
}

$count = 0
foreach ($file in $files) {
    $content = Get-Content $file.FullName -Raw
    $changed = $false
    
    foreach ($key in $replacements.Keys) {
        if ($content.Contains($key)) {
            $content = $content.Replace($key, $replacements[$key])
            $changed = $true
        }
    }
    
    foreach ($key in $labelReplacements.Keys) {
        if ($content.Contains($key)) {
            $content = $content.Replace($key, $labelReplacements[$key])
            $changed = $true
        }
    }
    
    if ($changed) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        $count++
        Write-Host "Updated: $($file.Name)"
    }
}

# Also do components directory
$componentsPath = Join-Path $PSScriptRoot "src\components"
$compFiles = Get-ChildItem -Path $componentsPath -Recurse -Filter "*.tsx"

foreach ($file in $compFiles) {
    $content = Get-Content $file.FullName -Raw
    $changed = $false
    
    foreach ($key in $replacements.Keys) {
        if ($content.Contains($key)) {
            $content = $content.Replace($key, $replacements[$key])
            $changed = $true
        }
    }
    
    foreach ($key in $labelReplacements.Keys) {
        if ($content.Contains($key)) {
            $content = $content.Replace($key, $labelReplacements[$key])
            $changed = $true
        }
    }
    
    if ($changed) {
        Set-Content -Path $file.FullName -Value $content -NoNewline
        $count++
        Write-Host "Updated: $($file.Name)"
    }
}

Write-Host "`nTotal files updated: $count"
