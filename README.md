# Your Mom — Focus Extension

A Chrome extension that extracts Open Graph (og) meta tags from web pages when tabs change and sends them as JSON API requests.

## Features

- **Focus Mode**: Start/stop focus sessions with task tracking
- **OG Tag Extraction**: Automatically extracts Open Graph meta tags from web pages
- **API Integration**: Sends extracted data as JSON to your configured API endpoint
- **Real-time Status**: Shows extraction status in the popup interface

## Setup

### 1. Configure API Endpoint

Edit `background.js` and update the configuration:

```javascript
const API_ENDPOINT = "https://your-api-endpoint.com/og-tags";
const API_KEY = "your-api-key-here"; // Optional
```

### 2. Install Extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select this folder
4. The extension should now appear in your extensions list

## Usage

1. **Start Focus Mode**: 
   - Click the extension icon
   - Enter a task name
   - Click "Start focusing"

2. **OG Tag Extraction**:
   - When focus mode is active, the extension will automatically extract og tags when you switch tabs
   - Extracted data includes:
     - `og:title`, `og:description`, `og:image`, `og:url`, `og:type`, etc.
     - Page title, URL, and timestamp
     - Additional meta tags (description, keywords)

3. **API Requests**:
   - Data is sent as JSON POST requests to your configured endpoint
   - Includes Authorization header if API key is configured

## Extracted Data Format

```json
{
  "og:title": "Page Title",
  "og:description": "Page description",
  "og:image": "https://example.com/image.jpg",
  "og:url": "https://example.com/page",
  "og:type": "website",
  "og:site_name": "Site Name",
  "og:locale": "en_US",
  "pageTitle": "Browser Tab Title",
  "pageUrl": "https://example.com/page",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "description": "Meta description",
  "keywords": "meta, keywords"
}
```

## Testing

1. Open `test.html` in your browser to test og tag extraction
2. Start focus mode in the extension
3. Switch between tabs to trigger extraction
4. Check browser console for debug logs

## Files

- `manifest.json` - Extension configuration
- `background.js` - Background service worker (API requests, tab monitoring)
- `content.js` - Content script (og tag extraction)
- `popup.html` - Extension popup interface
- `popup.js` - Popup functionality
- `test.html` - Test page with sample og tags

## Permissions

- `tabs` - Access to tab information
- `storage` - Local storage for settings
- `activeTab` - Access to current tab content
- `host_permissions` - Access to all URLs for content script injection

## Debugging

Check the browser console for debug messages:
- `[YourMom]` - Extension logs
- Look for "Extracted og tags" and "API response" messages
