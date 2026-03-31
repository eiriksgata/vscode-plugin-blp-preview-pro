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
