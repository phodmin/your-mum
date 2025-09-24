// Content script to extract meta og tags from the current page
function extractOgTags() {
  console.log("[YourMom Content] Starting og tag extraction from:", window.location.href);
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
  
  console.log("[YourMom Content] Looking for og tags...");
  
  // Extract og tags from meta elements
  ogProperties.forEach(property => {
    const metaTag = document.querySelector(`meta[property="${property}"]`);
    if (metaTag && metaTag.content) {
      ogTags[property] = metaTag.content;
      console.log(`[YourMom Content] Found ${property}:`, metaTag.content);
    } else {
      console.log(`[YourMom Content] No ${property} found`);
    }
  });
  
  // Also extract basic page info
  ogTags.pageTitle = document.title;
  ogTags.pageUrl = window.location.href;
  ogTags.timestamp = new Date().toISOString();
  
  console.log("[YourMom Content] Page info:", {
    title: ogTags.pageTitle,
    url: ogTags.pageUrl,
    timestamp: ogTags.timestamp
  });
  
  // Extract additional meta tags that might be useful
  const description = document.querySelector('meta[name="description"]');
  if (description && description.content) {
    ogTags.description = description.content;
    console.log("[YourMom Content] Found description:", description.content);
  } else {
    console.log("[YourMom Content] No description meta tag found");
  }
  
  const keywords = document.querySelector('meta[name="keywords"]');
  if (keywords && keywords.content) {
    ogTags.keywords = keywords.content;
    console.log("[YourMom Content] Found keywords:", keywords.content);
  } else {
    console.log("[YourMom Content] No keywords meta tag found");
  }
  
  console.log("[YourMom Content] Final extracted data:", ogTags);
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
