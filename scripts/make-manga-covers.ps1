# Recorta as 40 capas de mangás de "Assets\mangas.jfif" (folha 10x4).
# A arte de cada capa é detectada (sem as bordas brancas da foto) e preenchida num quadro
# 128x180, um pouco mais alto que a capa original: o livro nas mãos fica sem moldura branca.
param(
  [string]$Src = 'D:\MyProjects\Apps\Assets\mangas.jfif',
  [string]$Dest = "$PSScriptRoot\..\src\renderer\assets\mangas",
  [int]$Cols = 10,
  [int]$Rows = 4,
  [int]$Inset = 3,
  [int]$OutW = 128,
  [int]$OutH = 190
)

Add-Type -AssemblyName System.Drawing
Add-Type -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class Trim {
  // Bounding box of the non-white pixels (the cover art), ignoring the photo margins.
  public static Rectangle Art(Bitmap bmp) {
    Rectangle rect = new Rectangle(0, 0, bmp.Width, bmp.Height);
    Bitmap src = new Bitmap(bmp.Width, bmp.Height, PixelFormat.Format24bppRgb);
    using (Graphics g = Graphics.FromImage(src)) g.DrawImage(bmp, 0, 0);
    BitmapData data = src.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format24bppRgb);
    int stride = data.Stride;
    byte[] buf = new byte[stride * src.Height];
    Marshal.Copy(data.Scan0, buf, 0, buf.Length);
    src.UnlockBits(data);
    int minX = src.Width, minY = src.Height, maxX = -1, maxY = -1;
    for (int y = 0; y < src.Height; y++) {
      int row = y * stride;
      for (int x = 0; x < src.Width; x++) {
        int i = row + x * 3;
        if (buf[i] <= 235 || buf[i + 1] <= 235 || buf[i + 2] <= 235) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    src.Dispose();
    if (maxX < 0) return new Rectangle(0, 0, bmp.Width, bmp.Height);
    return Rectangle.FromLTRB(minX, minY, maxX + 1, maxY + 1);
  }
}
'@ -ReferencedAssemblies System.Drawing

if (-not (Test-Path $Dest)) { New-Item -ItemType Directory -Path $Dest -Force | Out-Null }
$img = [System.Drawing.Image]::FromFile($Src)
$cellW = $img.Width / $Cols
$cellH = $img.Height / $Rows
$n = 0
for ($r = 0; $r -lt $Rows; $r++) {
  for ($c = 0; $c -lt $Cols; $c++) {
    $x = [int]([Math]::Round($c * $cellW)) + $Inset
    $y = [int]([Math]::Round($r * $cellH)) + $Inset
    $w = [int]([Math]::Round($cellW)) - 2 * $Inset
    $h = [int]([Math]::Round($cellH)) - 2 * $Inset
    $cell = New-Object System.Drawing.Bitmap $w, $h
    $g = [System.Drawing.Graphics]::FromImage($cell)
    $g.DrawImage($img, (New-Object System.Drawing.Rectangle 0, 0, $w, $h), (New-Object System.Drawing.Rectangle $x, $y, $w, $h), [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()

    $art = [Trim]::Art($cell)
    $cell.Dispose()
    # The art fills the frame (no white border at all): the cover is a bit taller than the
    # photo, so the book in her hands looks like a book.
    $out = New-Object System.Drawing.Bitmap $OutW, $OutH, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $og = [System.Drawing.Graphics]::FromImage($out)
    $og.Clear([System.Drawing.Color]::Transparent)
    $og.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $og.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $og.DrawImage($img, (New-Object System.Drawing.Rectangle 0, 0, $OutW, $OutH), (New-Object System.Drawing.Rectangle ($x + $art.X), ($y + $art.Y), $art.Width, $art.Height), [System.Drawing.GraphicsUnit]::Pixel)
    $og.Dispose()
    $name = 'manga_{0:d2}.png' -f $n
    $out.Save((Join-Path $Dest $name), [System.Drawing.Imaging.ImageFormat]::Png)
    $out.Dispose()
    $n++
  }
}
$img.Dispose()
"Gerou $n capas em $Dest"
