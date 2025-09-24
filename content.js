// Content script to extract meta og tags from the current page
function extractOgTags() {
  const ogTags = {};
  
  // Common og tag properties to extract
  const ogProperties = [
    'og:title',
    'og:description', 
    'og:image',
    'og:url',
    'og:type',
    'og:site_name',
    'og:locale',
    'og:video',
    'og:audio'
  ];
  
  // Extract og tags from meta elements
  ogProperties.forEach(property => {
    const metaTag = document.querySelector(`meta[property="${property}"]`);
    if (metaTag && metaTag.content) {
      ogTags[property] = metaTag.content;
    }
  });
  
  // Also extract basic page info
  ogTags.pageTitle = document.title;
  ogTags.pageUrl = window.location.href;
  ogTags.timestamp = new Date().toISOString();
  
  // Extract additional meta tags that might be useful
  const description = document.querySelector('meta[name="description"]');
  if (description && description.content) {
    ogTags.description = description.content;
  }
  
  const keywords = document.querySelector('meta[name="keywords"]');
  if (keywords && keywords.content) {
    ogTags.keywords = keywords.content;
  }
  
  return ogTags;
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extractOgTags') {
    try {
      const ogTags = extractOgTags();
      sendResponse({ success: true, data: ogTags });
    } catch (error) {
      console.error('[YourMom] Error extracting og tags:', error);
      sendResponse({ success: false, error: error.message });
    }
  }
  return true; // Keep message channel open for async response
});

// Auto-extract when page loads (optional - can be triggered by background script instead)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    // Page loaded, og tags are now available
    console.log('[YourMom] Content script loaded, og tags ready for extraction');
  });
} else {
  // Page already loaded
  console.log('[YourMom] Content script loaded, og tags ready for extraction');
}
