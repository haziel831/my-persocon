# Copia as artes de comida escolhidas de Assets\NEW\Ghostpixxells_pixelfood para
# src\renderer\assets\food32 (nomes limpos, sem o número do arquivo original).
$src = 'D:\MyProjects\Apps\Assets\NEW\Ghostpixxells_pixelfood'
$dest = "$PSScriptRoot\..\src\renderer\assets\food32"

$map = [ordered]@{
  'burger'         = '15_burger.png'
  'pizza'          = '81_pizza.png'
  'sushi'          = '97_sushi.png'
  'ramen'          = '87_ramen.png'
  'spaghetti'      = '94_spaghetti.png'
  'macncheese'     = '67_macncheese.png'
  'curry'          = '32_curry.png'
  'burrito'        = '18_burrito.png'
  'taco'           = '99_taco.png'
  'sandwich'       = '92_sandwich.png'
  'hotdog'         = '54_hotdog.png'
  'pancakes'       = '79_pancakes.png'
  'waffle'         = '101_waffle.png'
  'frenchfries'    = '44_frenchfries.png'
  'popcorn'        = '83_popcorn.png'
  'potatochips'    = '77_potatochips.png'
  'nacho'          = '71_nacho.png'
  'roastedchicken' = '85_roastedchicken.png'
  'steak'          = '95_steak.png'
  'salmon'         = '88_salmon.png'
  'dumplings'      = '36_dumplings.png'
  'omlet'          = '73_omlet.png'
  'cheesepuff'     = '24_cheesepuff.png'
  'garlicbread'    = '48_garlicbread.png'
  'donut'          = '34_donut.png'
  'applepie'       = '05_apple_pie.png'
  'lemonpie'       = '63_lemonpie.png'
  'fruitcake'      = '46_fruitcake.png'
  'cookies'        = '28_cookies.png'
  'chocolate'      = '26_chocolate.png'
  'pudding'        = '75_pudding.png'
  'icecream'       = '57_icecream.png'
  'jelly'          = '59_jelly.png'
  'gummybear'      = '50_giantgummybear.png'
  'gingerbreadman' = '52_gingerbreadman.png'
}

if (-not (Test-Path $dest)) { New-Item -ItemType Directory -Path $dest -Force | Out-Null }
foreach ($name in $map.Keys) {
  $from = Join-Path $src $map[$name]
  if (-not (Test-Path $from)) { Write-Warning "Falta: $from"; continue }
  Copy-Item $from (Join-Path $dest "$name.png") -Force
}
"Copiei $($map.Count) artes para $dest"
