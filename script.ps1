$root = "c:\Users\antoine.deyris\Documents\mcu-flowchart";
$fixedPath = Join-Path $root "apps\web\src\lib\flowchartFixedPositions.json";
$zonesPath = Join-Path $root "apps\web\src\lib\flowchartUniverseZones.json";

$fixed = Get-Content -Raw -Path $fixedPath | ConvertFrom-Json;
$fixed.PSObject.Properties | ForEach-Object {
  if ($_.Value -and $_.Value.PSObject.Properties.Name -contains "y") {
    $_.Value.y = [int]$_.Value.y + 400;
  }
};
$fixed | ConvertTo-Json -Depth 100 | Set-Content -Path $fixedPath -Encoding UTF8;

$zones = Get-Content -Raw -Path $zonesPath | ConvertFrom-Json;
$fox = $zones."fox-marvel-cinematic-universe";
if ($fox -and $fox.corners) {
  foreach ($corner in $fox.corners) {
    $corner.y = [int]$corner.y + 400;
  }
}
$zones | ConvertTo-Json -Depth 100 | Set-Content -Path $zonesPath -Encoding UTF8;

Write-Output "Updated positions: all cards Y-200 and Fox zone corners Y-200";


$root = "c:\Users\antoine.deyris\Documents\mcu-flowchart";
$fixedPath = Join-Path $root "apps\web\src\lib\flowchartFixedPositions.json";
$zonesPath = Join-Path $root "apps\web\src\lib\flowchartUniverseZones.json";

$utf8NoBom = New-Object System.Text.UTF8Encoding($false);

$fixedObj = Get-Content -Raw -Path $fixedPath | ConvertFrom-Json;
$fixedJson = $fixedObj | ConvertTo-Json -Depth 100;
[System.IO.File]::WriteAllText($fixedPath, $fixedJson, $utf8NoBom);

$zonesObj = Get-Content -Raw -Path $zonesPath | ConvertFrom-Json;
$zonesJson = $zonesObj | ConvertTo-Json -Depth 100;
[System.IO.File]::WriteAllText($zonesPath, $zonesJson, $utf8NoBom);

Write-Output "Rewrote JSON files as UTF-8 without BOM";