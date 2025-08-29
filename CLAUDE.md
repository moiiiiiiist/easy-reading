# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Story Claude (轻松阅读) is a browser-based English learning application that helps users read articles with AI-powered word explanations and sentence analysis. It features high-quality text-to-speech capabilities and local data storage.

## Architecture

### Core Components

The application uses a multi-class inheritance architecture:

- **BaseApp** (base-app.js): Foundation class providing common functionality for all app instances
  - Initializes core managers: StorageManager, SentenceSplitter, GoogleAPIService, AudioManager
  - Handles file uploads and common operations
  
- **MainApp** (main-app.js): Main page application extending BaseApp
  - Manages article list, settings, and navigation
  - Controls the home page (index.html)
  
- **ReadingApp** (reading-app.js): Reading mode application extending BaseApp  
  - Handles sentence-by-sentence reading with highlighting
  - Manages word/sentence explanations and TTS playback
  - Controls the reading page (reading.html)

### Service Classes

- **StorageManager** (storage.js): IndexedDB and localStorage management
- **GoogleAPIService** (google-api.js): Gemini AI and Google Cloud TTS integration
- **AudioManager** (audio-manager.js): Multi-source TTS with caching
- **SentenceSplitter** (sentence-splitter.js): Smart sentence parsing
- **GlobalTimeManager** (global-time-manager.js): Centralized time tracking
- **TimeTracker** (time-tracker.js): Session time statistics
- **FloatingTimer** (floating-timer.js): Visual timer display

## Development Commands

### Start Development
```bash
# Open index.html directly in browser (no server needed)
open index.html

# Or use a simple HTTP server if needed
python3 -m http.server 3000
# Then visit http://localhost:3000
```

### Testing
```bash
# Test pages can be opened directly
open test-timer.html
```

## Key Technical Details

### TTS Priority System
1. Google Cloud TTS (highest quality, requires API key)
2. Web Speech API (browser native, free)
3. Google Translate TTS (fallback)

### Data Storage
- **IndexedDB**: Articles, audio cache, time statistics
- **localStorage**: Settings, API keys, current article ID

### API Integration
- Google Gemini AI for word/sentence analysis
- Google Cloud Text-to-Speech for high-quality audio
- All API keys stored locally in browser

### File Handling
- Supports .txt file uploads for articles
- Text import from clipboard/paste
- All processing happens client-side

## Important Patterns

### Event Flow
1. User actions trigger events in MainApp or ReadingApp
2. Apps delegate to service classes (Storage, Audio, etc.)
3. Services handle API calls and data persistence
4. UI updates through DOM manipulation

### State Management
- Current article tracked via localStorage
- Reading progress maintained per session
- Settings persisted across sessions

### Error Handling
- API failures gracefully fallback to alternatives
- User-friendly error messages displayed
- Console logging for debugging