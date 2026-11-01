import { execFileSync } from 'node:child_process'

/** Moves a file to the Windows Recycle Bin. */
export function recycleFile(path: string): void {
  execFileSync('powershell.exe', [
    '-NoProfile',
    '-Command',
    `Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile('${path.replaceAll("'", "''")}', 'OnlyErrorDialogs', 'SendToRecycleBin')`,
  ])
}
