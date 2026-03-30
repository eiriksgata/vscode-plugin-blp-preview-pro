# Change Log

## [1.1.0] - 2026-03-30

### Changed
- **BREAKING**: Renamed all internal command/view prefixes from `blpPreview` to `blpPreviewPro` for independent plugin identity
  - All command IDs updated (e.g., `blpPreview.convert2png` → `blpPreviewPro.convert2png`)
  - All view container and view IDs updated (e.g., `blpPreview.mpqExplorer` → `blpPreviewPro.mpqExplorer`)
  - All configuration keys updated (e.g., `blpPreview.mpqLocation` → `blpPreviewPro.mpqLocation`)
  - ⚠️ Users will need to reconfigure MPQ path after upgrade
- Updated configuration section title to "blpPreviewPro configuration"

### Fixed
- Fixed MPQ Explorer appearing stuck in "loading" state when no MPQ path is configured
  - Task initialization now properly resolves immediately instead of hanging indefinitely
  - Users now see "Select Warcraft MPQ Path..." action button as expected

## [1.0.0] - 2026-03-30

Initial release as independent plugin

[0.0.2]
add mdx and mdl support

[0.0.3]
fix mdx texture container folder not show

[0.0.4]
support file extension upcase

[0.0.5]
add configure blpView.mpqLocation to support load texture from it 

[0.0.6]
add speed scale control

[0.0.7]
support tga texture for model view

[0.0.8]
fix tuxture load mutil times bug

[0.0.9]
remove confict whit image preview

[0.1.1]
fix bugs

[0.1.3]
support w3x2Lni dir unit

[0.1.4]
remain context when hidden

[0.1.6]
fix bugs and support blp2

[0.1.8]
support png,jpg convert to blp, and blp convert to png,jpg

[0.1.9]
support mdl,mdx convert to mdx,mdl

[0.2.0]
support blp,jpg,png multiple translate

[0.2.2]
add grid support

[0.2.3]
support mpq audio play

[0.2.4]
support w3x file explorer

[0.2.5]
support slk file viewer

[0.2.6]
support mmp,w3i,w3c file viewer
fix w3x explore bug

[0.2.7]
More Comprehensive Search for w3x Files

[0.2.8]
support extract mdx with textures

[0.2.9]
fix: unsupport unicode hash
feat: support read reg get war3 path

[0.3.0]
fix bugs

[0.3.1]
fix bugs

[0.3.2]
power by DacianSky support mac

[0.3.3]
support convert config
w3x explorer support mpq extention
remove mdl file preview

[0.3.4]
support retainContextWhenHidden for model view
