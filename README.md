# AI Newsletter Generator - VS Code Extension

A beautifully designed VS Code extension that generates AI-powered newsletters with an enhanced TabNine-style interface.

## ✨ Features

### 🎨 Modern TabNine-Inspired UI
- **Status Indicators**: Real-time visual status with animated icons
- **Progress Tracking**: Visual progress bar showing generation steps
- **Smart Icons**: Contextual icons for different types of content
- **Color-Coded Items**: Different colors for various states and actions
- **Professional Layout**: Clean, organized tree view similar to TabNine

### 🚀 Functionality
- **Interactive Newsletter Generation**: Step-by-step guided process
- **Real-time Output**: Live updates in the sidebar
- **Smart Input Detection**: Automatic detection when user input is required
- **Topic Tracking**: Shows current newsletter topic
- **Progress Visualization**: Shows which step you're currently on

### 🎯 UI Components

#### Status Section
- 🟢 **Active Status**: Shows current generation step with animated pulse
- ⚪ **Inactive Status**: Ready state indicator
- 📊 **Progress Bar**: Visual representation of completion (▓▓▓░░░)

#### Action Buttons
- 🚀 **Start Newsletter**: Begin the generation process
- ⏹️ **Stop Newsletter**: Halt the current process
- ✏️ **Provide Input**: Submit required input (highlighted when needed)

#### Output Display
- 🔄 **Real-time Updates**: Live output from the AI generation process
- 📝 **Recent Activity**: Highlighted recent messages
- 🎯 **Contextual Icons**: Different icons for different types of messages
  - ❌ Errors
  - 🔄 Loading/Generating
  - ℹ️ Information
  - ❓ Questions/Input requests
  - ✅ Success/Completion
  - 💬 Terminal output

## 🛠️ Usage

1. **Open the Extension**: Click on the AI Newsletter icon in the activity bar
2. **Start Generation**: Click "🚀 Start Newsletter" 
3. **Follow the Process**: Watch the progress bar and status updates
4. **Provide Input**: When "✏️ PROVIDE INPUT" appears, click to enter your response
5. **Monitor Progress**: Track your progress through the 4 main steps:
   - Step 1: Generating Headings
   - Step 2: Planning Sections  
   - Step 3: Writing Content
   - Step 4: Finalizing

## 🎨 Visual Enhancements

The extension features a modern, professional interface inspired by TabNine:

- **Themed Icons**: Uses VS Code's built-in icon theme with custom colors
- **Status Animations**: Pulsing indicators for active states
- **Progress Visualization**: ASCII-style progress bars
- **Contextual Styling**: Different visual styles for different types of content
- **Hover Effects**: Interactive elements with hover states
- **Color Coordination**: Consistent color scheme throughout

## 📋 Requirements

- Python 3.x installed on your system
- VS Code 1.74.0 or higher

## 🚀 Development

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch for changes during development
npm run watch
```

## 📝 Extension Details

- **Publisher**: Your Name
- **Version**: 0.0.1
- **Category**: AI Tools
- **License**: MIT

---

*Experience AI-powered newsletter generation with a beautiful, intuitive interface that rivals the best VS Code extensions!*

## Features

Describe specific features of your extension including screenshots of your extension in action. Image paths are relative to this README file.

For example if there is an image subfolder under your extension project workspace:

\!\[feature X\]\(images/feature-x.png\)

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow.

## Requirements

If you have any requirements or dependencies, add a section describing those and how to install and configure them.

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: Enable/disable this extension.
* `myExtension.thing`: Set to `blah` to do something.

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release of ...

### 1.0.1

Fixed issue #.

### 1.1.0

Added features X, Y, and Z.

---

## Following extension guidelines

Ensure that you've read through the extensions guidelines and follow the best practices for creating your extension.

* [Extension Guidelines](https://code.visualstudio.com/api/references/extension-guidelines)

## Working with Markdown

You can author your README using Visual Studio Code. Here are some useful editor keyboard shortcuts:

* Split the editor (`Cmd+\` on macOS or `Ctrl+\` on Windows and Linux).
* Toggle preview (`Shift+Cmd+V` on macOS or `Shift+Ctrl+V` on Windows and Linux).
* Press `Ctrl+Space` (Windows, Linux, macOS) to see a list of Markdown snippets.

## For more information

* [Visual Studio Code's Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy!**
