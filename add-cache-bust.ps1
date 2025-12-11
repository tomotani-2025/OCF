$files = Get-ChildItem -Path "c:\Users\Todd\OneDrive\Documents\OmotaniCaringFoundation-Website\site" -Filter "*.html" -File

foreach ($file in $files) {
    $content = Get-Content -Path $file.FullName -Raw
    $content = $content -replace 'href="css/styles\.css"', 'href="css/styles.css?v=2"'
    $content = $content -replace "href='css/styles\.css'", "href='css/styles.css?v=2'"
    $content = $content -replace 'src="js/main\.js"', 'src="js/main.js?v=2"'
    $content = $content -replace "src='js/main\.js'", "src='js/main.js?v=2'"
    Set-Content -Path $file.FullName -Value $content -NoNewline
    Write-Host "Updated: $($file.Name)"
}
