# BLP Preview Pro - Warcraft III Assets Viewer

**Professional Warcraft III asset viewer and editor for VS Code** – Advanced extension for developers, modders, and content creators working with Warcraft III resources.

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Version](https://img.shields.io/badge/Version-1.1.0-blue.svg)

## 🎯 Overview

BLP Preview Pro is an enhanced, feature-rich extension designed for professionals working with Warcraft III game assets. This edition provides advanced capabilities beyond basic resource preview, including:

- **Advanced file format support** for BLP, TGA, MDX, W3X, and more
- **MPQ archive explorer** with full file browsing and extraction
- **Interactive 3D model viewer** for MDX/MDL models with lighting and camera control
- **W3X map preview** with terrain and object visualization
- **Format conversion tools** (BLP↔PNG/JPG, MDX↔MDL)
- **Professional-grade UI** with status indicators and progress tracking

This is the **Pro version**, distinct from the basic preview extension with enterprise-level features and performance optimizations.

## ✨ Features

### Image Preview
- **BLP Format** - Preview Warcraft III BLP images with full color rendering
- **TGA Format** - Support for TGA images with alpha channel
- Native VS Code editor integration with drag-and-drop support

### Data Format Support
- **SLK** - Data table preview and editing
- **MMP** - Map metadata
- **W3C** - Campaign data
- **W3I** - Map information

### Advanced Features

#### MPQ Archive Explorer
- Browse MPQ archives with full directory structure
- Extract individual files or batch export
- File search and navigation
- Texture extraction for model preview

#### W3X Map Tools
- Interactive map preview with 3D terrain
- Unit and doodad visualization
- Minimap display
- Object placement inspector

#### 3D Model Viewer
- MDX model preview with realistic rendering
- MDL script support
- Texture mapping with MPQ integration
- Animation playback
- Camera controls (zoom, rotate, pan)
- Grid and wireframe display modes

### Format Conversion
- **BLP ↔ PNG/JPG** - Batch or individual conversion
- **MDL ↔ MDX** - Seamless format conversion
- One-click conversion with progress tracking

## 🚀 Getting Started

### Installation
1. Install from [VS Code Marketplace](https://marketplace.visualstudio.com/)
2. Restart VS Code

### Configuration

#### MPQ Archive Location
For full texture support in model preview, configure your MPQ archive:

1. Open Command Palette (`Ctrl+Shift+P`)
2. Run: **BLP Preview Pro: Select MPQ Location**
3. Navigate to your Warcraft III installation folder
4. Select the MPQ archives (typically in `Data/` folder)

```json
// .vscode/settings.json
{
  "blpPreviewPro.mpqLocation": "/path/to/warcraft/data"
}
```

## 📖 Usage

### Preview Assets
- Right-click on a file: **Open With → BLP Preview Pro**
- Or simply click on supported files to preview
- Supported extensions auto-open with this extension

### Extract from MPQ
1. Click MPQ Explorer icon in sidebar
2. Set MPQ location in settings
3. Browse archive contents
4. Right-click → **Extract File** or **Extract All**

### Convert Formats
1. Right-click on a file (PNG, JPG, BLP, MDL, MDX)
2. Select conversion command:
   - Convert to BLP
   - Convert to PNG
   - Convert to JPG
   - Convert to MDX
   - Convert to MDL

### View 3D Models
- Open `.mdx` or `.mdl` files in the editor
- Use mouse controls:
  - **Left Drag** - Rotate
  - **Right Drag** - Pan
  - **Scroll** - Zoom
- Status bar shows current zoom and model info

### Explore Maps
- Open `.w3x` files to view map preview
- Inspect terrain, units, and objects
- Export terrain data

## 🎮 Supported Formats

### Images
| Format | Preview | Export |
|--------|---------|--------|
| BLP    | ✅      | ✅     |
| TGA    | ✅      | ❌     |

### Data Tables
| Format | Support |
|--------|---------|
| SLK    | ✅      |
| MMP    | ✅      |
| W3C    | ✅      |
| W3I    | ✅      |
| W3D    | ✅      |
| W3U    | ✅      |

### 3D Assets
| Format | Preview | Export |
|--------|---------|--------|
| MDX    | ✅      | ✅     |
| MDL    | ✅      | ✅     |

### Archives
| Format | Support |
|--------|---------|
| MPQ    | ✅      |
| W3X    | ✅      |

## 🎨 User Interface

### Status Bar Integration
- File size indicator
- Current zoom level for 3D views
- Binary format info
- Preview status

### Sidebar Explorer
- **MPQ Explorer** - Browse and extract MPQ archives
- **W3X Explorer** - Inspect Map files
- Real-time file tree navigation

## 🔧 Advanced Usage

### Batch Conversion
1. Open Command Palette
2. Run conversion command on multiple selections
3. Monitor progress in output channel

### Copy to Clipboard
- Right-click on file → **Copy Path** (including texture data for models)

### Settings Reference
```json
{
  "blpPreviewPro.retainContextWhenHidden": true,
  "blpPreviewPro.mpqLocation": ""
}
```

## 📋 Commands

| Command | Description |
|---------|-------------|
| Convert to BLP | Convert PNG/JPG to BLP format |
| Convert to PNG | Convert BLP to PNG format |
| Convert to JPG | Convert BLP to JPG format |
| Convert to MDX | Convert MDL to MDX format |
| Convert to MDL | Convert MDX to MDL format |
| Select MPQ Location | Configure MPQ archive path |
| Reload MPQ Archives | Refresh MPQ archive cache |
| Show MPQ Status | Display MPQ configuration status |
| Open MPQ | Browse and open MPQ archive |
| Open W3X | Browse and open W3X map file |
| Copy Path | Copy file path to clipboard |

## 🐛 Known Issues

- Large MPQ archives (500MB+) may take time to index
- Some edge-case TGA files with unusual compression may not render
- Model previews require sufficient RAM for very large MDX files

## 💡 Tips & Tricks

- **Drag & Drop**: Drag image files into conversion commands for batch processing
- **Quick Preview**: Hold Alt while clicking to preview in split view
- **Search**: Use MPQ Explorer search to quickly locate assets
- **Shortcuts**: Set custom keybindings for frequently used conversions

## 🤝 Contributing

Issues, suggestions, and contributions are welcome!

- [GitHub Repository](https://github.com/eiriksgata/vscode-plugin-blp-preview-pro)
- [Report Issues](https://github.com/eiriksgata/vscode-plugin-blp-preview-pro/issues)

## 📚 Acknowledgments

This project builds upon and extends community contributions:

- [war3-model](https://github.com/4eb0da/war3-model) - Model format parser
- [mdx-m3-viewer](https://github.com/flowtsohg/mdx-m3-viewer) - 3D viewer foundation
- [tgajs](https://github.com/vthibault/jsTGALoader) - TGA format support
- [DacianSky](https://github.com/DacianSky) - Community contributions
- Original blp-preview extension - Basic functionality inspiration

## 📞 Support & Community

- **QQ Group**: 434524811 (for Chinese community)
- **GitHub**: [Submit issues for technical support](https://github.com/eiriksgata/vscode-plugin-blp-preview-pro/issues)
- **VS Code Marketplace**: Leave reviews and feedback

## 📄 License

MIT License - See LICENSE file for details
Copyright © 2024 Eirik Sgata

---

**This is the Professional Edition** - Enhanced version with advanced MPQ browsing, batch conversion, and enterprise-grade features. Not affiliated with the basic blp-preview extension.
