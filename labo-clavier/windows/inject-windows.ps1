# Envoie de VRAIES frappes au système Windows (SendInput, par code de balayage) : elles passent par la disposition de
# clavier active exactement comme celles d'un clavier physique. Non testé sur Windows au moment de l'écriture.
# Usage : pwsh inject-windows.ps1 -Json '[{"sc":18,"ext":false,"shift":false,"alt":true}, ...]'
param([Parameter(Mandatory = $true)][string]$Json)
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class KP {
  [StructLayout(LayoutKind.Sequential)] public struct KEYBDINPUT { public ushort wVk; public ushort wScan; public uint dwFlags; public uint time; public IntPtr dwExtraInfo; }
  [StructLayout(LayoutKind.Explicit)] public struct INPUT { [FieldOffset(0)] public uint type; [FieldOffset(8)] public KEYBDINPUT ki; }
  [DllImport("user32.dll", SetLastError = true)] public static extern uint SendInput(uint n, INPUT[] inputs, int size);
  public static void Key(ushort sc, bool ext, bool up) {
    var i = new INPUT[1]; i[0].type = 1; i[0].ki.wScan = sc; i[0].ki.dwFlags = 0x0008 | (up ? 0x0002u : 0u) | (ext ? 0x0001u : 0u);
    SendInput(1, i, Marshal.SizeOf(typeof(INPUT)));
  }
}
"@
$steps = $Json | ConvertFrom-Json
foreach ($s in $steps) {
  if ($s.shift) { [KP]::Key(0x2A, $false, $false); Start-Sleep -Milliseconds 30 }
  if ($s.alt)   { [KP]::Key(0x38, $true,  $false); Start-Sleep -Milliseconds 30 }   # Alt droit (AltGr)
  [KP]::Key([uint16]$s.sc, [bool]$s.ext, $false); Start-Sleep -Milliseconds 40
  [KP]::Key([uint16]$s.sc, [bool]$s.ext, $true);  Start-Sleep -Milliseconds 30
  if ($s.alt)   { [KP]::Key(0x38, $true,  $true);  Start-Sleep -Milliseconds 30 }
  if ($s.shift) { [KP]::Key(0x2A, $false, $true);  Start-Sleep -Milliseconds 30 }
  Start-Sleep -Milliseconds 80
}
