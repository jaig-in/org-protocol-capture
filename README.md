# Org Protocol Capture

![Org Protocol Capture](src/icons/icon-128.png)

A local Firefox and Chrome extension that reviews the open page — title, URL, and selected text — and hands that to Emacs through `org-protocol`. You finish the note in Emacs, including why you kept it.

This repository is the release. The extension is not on the Chrome Web Store or Firefox Add-ons, and it does not auto-update. Load the built folder yourself.

It does not install an Emacs server or an operating-system protocol handler. Those are separate, and the same extension works whether Emacs is running on Windows, macOS, or Linux.

## What a capture contains

The popup builds one URI:

```text
org-protocol://capture?template=p&url=...&title=...&body=...
```

`url`, `title`, and `body` are encoded with `URLSearchParams`. In Firefox, the container name and cookie-store id are appended to the body as plain text when a container is available. Chrome has no containers. Nothing in the URI restores a container, a login, or the original tab.

The source tab stays open. “Capture requested” only means the browser was asked to open the link. The extension cannot tell whether Emacs saved the note.

## Requirements

- Chrome 102 or newer, or Firefox 109 or newer.
- Node.js 20 or newer, only to build. There are no packages to install.
- Emacs with Org 9.5 or newer. Older Org 9.0–9.4 mishandles the `+` space encoding from `URLSearchParams`.
- `org-protocol` loaded in the Emacs server that should receive captures.
- An OS handler that passes the **entire** `org-protocol:` URI to `emacsclient` as one argument.
- An Emacs window already open. The template below stops at “Why”, and the client commands here do not create a frame.

## Build and load

From this directory:

```sh
npm test
npm run build
```

Load `dist/chrome` or `dist/firefox`, not the repository root.

### Chrome

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Choose **Load unpacked** and select `dist/chrome`.
4. Pin it from the Extensions menu if you want the toolbar button.
5. Open `chrome://extensions/shortcuts` to assign the action. The suggested shortcut is `Alt+Shift+O`; the browser leaves it unset when that chord is already taken.

Chrome remembers an unpacked extension across restarts. After a rebuild, click **Reload** on the extension card.

### Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. Choose **Load Temporary Add-on** and select `dist/firefox/manifest.json`.
3. Show the toolbar button from the Extensions menu if it is hidden.
4. Open `about:addons`, then the gear menu’s **Manage Extension Shortcuts**, to assign the action.

A temporary add-on lasts until Firefox quits. Load the manifest again after a restart. This project does not provide a signed `.xpi`.

Opening the popup does not send anything. Select the text you want, review the fields, then use **Open capture in Emacs**.

## Emacs

`org-protocol` and a capture template named `p` must exist in the Emacs instance that owns the server. If you already use `p` for something else, change that template or change the key in `src/protocol.js` (`template: 'p'`) and rebuild. The extension does not prompt for a URL inside Emacs; a separate manual template can still do that.

Adjust the inbox path, then evaluate this in the server you want to receive captures:

```elisp
(require 'org-capture)
(require 'org-protocol)
(require 'server)
(unless (server-running-p)
  (server-start))

(add-to-list 'org-capture-templates
             '("p" "Browser capture" entry
               (file "~/org/inbox.org")
               "* %:description\n:PROPERTIES:\n:URL: %:link\n:END:\n%U\n\n%:initial\n\nWhy: %?\n"))
```

`%:description` is the page title, `%:link` is the URL, and `%:initial` is the body. The cursor starts at **Why:**. `C-c C-c` saves. `C-c C-k` throws it away.

Start the server the way you normally do, for example `emacs --daemon`, or `M-x server-start` in a running Emacs. If the server has a name, add `-s NAME` to every `emacsclient` command below.

Check that the client sees that server:

```sh
emacsclient -e server-name
```

`server-name` is a variable. `(server-name)` asks Emacs to call a function and fails even when the server is fine.

## Register org-protocol

The handler has to deliver the raw URI once. Do not decode it a second time, do not split it on `&`, and do not paste the page text into the command.

These recipes replace an existing `org-protocol` handler for your user. They assume the default server. Insert `-s NAME` before `-n` when you use a named server.

### Linux

Put this in `~/.local/share/applications/org-protocol.desktop`. Use the real path from `command -v emacsclient`.

```ini
[Desktop Entry]
Name=Org Protocol
Comment=Send org-protocol links to Emacs
Exec=/usr/bin/emacsclient -n %u
Type=Application
Terminal=false
NoDisplay=true
MimeType=x-scheme-handler/org-protocol;
```

Then:

```sh
chmod +x ~/.local/share/applications/org-protocol.desktop
update-desktop-database ~/.local/share/applications
xdg-mime default org-protocol.desktop x-scheme-handler/org-protocol
```

A desktop file only affects browsers running on that Linux system. It does not affect a Windows browser talking to Emacs inside WSL.

Try a link. This opens a real capture buffer; use `C-c C-k` if you only wanted to test the handler:

```sh
xdg-open 'org-protocol://capture?template=p&url=https%3A%2F%2Fexample.com&title=Test&body=Hello'
```

### macOS

Emacs must already be running with `server-start`, or as a daemon. Point the script at the `emacsclient` that belongs to that Emacs:

- Homebrew on Apple silicon: `/opt/homebrew/bin/emacsclient`
- Homebrew on Intel: `/usr/local/bin/emacsclient`
- Emacs.app: `/Applications/Emacs.app/Contents/MacOS/bin/emacsclient`

```bash
mkdir -p "$HOME/Applications"
cat > /tmp/org-protocol-handler.applescript << 'EOF'
on open location thisURL
  do shell script "/opt/homebrew/bin/emacsclient -n " & quoted form of thisURL
end open location
EOF
osacompile -o "$HOME/Applications/Org Protocol.app" /tmp/org-protocol-handler.applescript
plist="$HOME/Applications/Org Protocol.app/Contents/Info.plist"
/usr/libexec/PlistBuddy -c 'Add :CFBundleURLTypes array' "$plist"
/usr/libexec/PlistBuddy -c 'Add :CFBundleURLTypes:0 dict' "$plist"
/usr/libexec/PlistBuddy -c 'Add :CFBundleURLTypes:0:CFBundleURLName string org-protocol' "$plist"
/usr/libexec/PlistBuddy -c 'Add :CFBundleURLTypes:0:CFBundleURLSchemes array' "$plist"
/usr/libexec/PlistBuddy -c 'Add :CFBundleURLTypes:0:CFBundleURLSchemes:0 string org-protocol' "$plist"
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "$HOME/Applications/Org Protocol.app"
```

`quoted form of thisURL` keeps `&` inside one argument. `do shell script` does not use your shell profile, so the `emacsclient` path has to be absolute.

The first open may ask which application should handle the link. Choose **Org Protocol**. A test link opens a real capture buffer:

```bash
open 'org-protocol://capture?template=p&url=https%3A%2F%2Fexample.com&title=Test&body=Hello'
```

### Windows, with Emacs on Windows

Use `emacsclientw.exe` from the Emacs you are actually running, so no console window flashes. This example is the usual GNU Emacs install path. Change it if Emacs lives somewhere else.

Run this in Windows PowerShell. It writes your user registry (`HKCU`), not the machine hive, and does not need an administrator.

```powershell
$client = 'C:\Program Files\Emacs\bin\emacsclientw.exe'
New-Item -Force 'HKCU:\Software\Classes\org-protocol\shell\open\command' | Out-Null
Set-Item 'HKCU:\Software\Classes\org-protocol' -Value 'URL:Org Protocol'
New-ItemProperty 'HKCU:\Software\Classes\org-protocol' -Name 'URL Protocol' -Value '' -Force | Out-Null
Set-Item 'HKCU:\Software\Classes\org-protocol\shell\open\command' -Value ('"{0}" -n "%1"' -f $client)
```

The quotes around `%1` are required. Without them, Windows splits the query on `&` and Emacs receives a truncated link.

A test link opens a real capture buffer:

```powershell
Start-Process 'org-protocol://capture?template=p&url=https%3A%2F%2Fexample.com&title=Test&body=Hello'
```

### Windows browser, Emacs inside WSL

Skip this when Emacs itself is a Windows, macOS, or Linux app. Use it only when the browser is on Windows and the Emacs server is inside a WSL distro.

`YOUR-DISTRO` is the name from `wsl.exe -l -v`. Add `-s NAME` before `-n` for a named server.

```powershell
$command = 'C:\Windows\System32\wsl.exe -d YOUR-DISTRO -e /usr/bin/emacsclient -n "%1"'
New-Item -Force 'HKCU:\Software\Classes\org-protocol\shell\open\command' | Out-Null
Set-Item 'HKCU:\Software\Classes\org-protocol' -Value 'URL:Org Protocol'
New-ItemProperty 'HKCU:\Software\Classes\org-protocol' -Name 'URL Protocol' -Value '' -Force | Out-Null
Set-Item 'HKCU:\Software\Classes\org-protocol\shell\open\command' -Value $command
```

`emacsclient` finds its socket through `XDG_RUNTIME_DIR`. A normal `wsl.exe -d YOUR-DISTRO -e ...` launch sets that variable. Do not wrap the client in a command that unsets it.

Keep an Emacs window open inside that distro before capturing. Confirm the bridge from PowerShell with `wsl.exe -d YOUR-DISTRO -e emacsclient -e server-name` before trying a browser click.

## Icons

Toolbar and add-ons icons are `src/icons/icon-16.png`, `icon-32.png`, `icon-48.png`, and `icon-128.png`. The popup uses the 32px image. Regenerate them, if you change the drawing, with:

```sh
python3 scripts/render-icons.py
npm run build
```

That script needs Pillow. The committed PNGs are what the build uses, so installing Pillow is optional.

## Permissions

| Permission | Why |
| --- | --- |
| `activeTab` | Read the tab you opened the popup on, not every tab all the time. |
| `scripting` | Read that page’s title, URL, and selection. |
| `contextualIdentities` (Firefox only) | Look up the container’s display name. |
| `cookies` (Firefox only) | Required by Firefox for container metadata. The extension does not read or write cookie values. |

Firefox may show a broad warning for the container permissions. `cookieStoreId` names the container’s store; it is not a cookie. Container names become part of the capture text, so read them before sending.

There is no telemetry, no network fetch, and no capture database inside the extension. Page text is shown as text, not inserted as HTML. The URI does contain the title, URL, selection, and any container lines you leave in the form. Do not capture secrets you do not want in Emacs or in the OS handoff.

## What it does not do

- It does not read browser-internal pages, some extension-store pages, or other protected pages.
- It does not archive the page. DOM, images, cookies, sessions, and form state stay in the browser.
- Following the saved URL later does not reopen the Firefox container or sign you in.
- A large selection can exceed the operating system’s command-length limit and never reach Emacs.
- The popup is a desktop panel, 390px wide, scrolling if the content passes the browser’s popup height cap. It is not a mobile layout.

## Development checks

`npm test` checks the URI builder and that both manifests point at the icon files. It does not prove that a browser, the OS, or Emacs accepted a handoff. After the handler is registered, capture one real page, confirm the title, URL, and selected text in Emacs (including `&` in the page address), save it, and abort a second one.

## License

No license file is included. Publishing this repository does not grant an open-source license.

## References

- [Chrome: load an unpacked extension](https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked)
- [Firefox: load a temporary add-on](https://firefox-source-docs.mozilla.org/devtools-user/about_colon_debugging/index.html#loading-a-temporary-extension)
- [Org: protocols](https://orgmode.org/manual/Protocols.html)
- [Org: the capture protocol](https://orgmode.org/manual/The-capture-protocol.html)
- [Org: template expansion](https://orgmode.org/manual/Template-expansion.html)
