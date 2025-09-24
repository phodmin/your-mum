// ---------- CONFIG: set your API endpoint ----------
// Replace with your actual API endpoint
const API_ENDPOINT = "https://your-api-endpoint.com/og-tags";
const API_KEY = "<PUT_YOUR_API_KEY_HERE>"; // Optional API key
// -------------------------------------------------------

async function getFocusState() {
  return await chrome.storage.local.get({ focusing: false });
}

async function extractOgTagsFromTab(tabId) {
  console.log("[YourMom] Attempting to extract og tags from tab:", tabId);
  try {
    // Send message to content script to extract og tags
    const response = await chrome.tabs.sendMessage(tabId, { action: 'extractOgTags' });
    
    if (response && response.success) {
      console.log("[YourMom] Successfully extracted og tags from tab:", tabId);
      return response.data;
    } else {
      console.warn("[YourMom] Failed to extract og tags from tab:", tabId, "Error:", response?.error);
      return null;
    }
  } catch (error) {
    console.warn("[YourMom] Error extracting og tags from tab:", tabId, "Error:", error.message);
    return null;
  }
}

async function sendOgTagsToAPI(ogTags) {
  if (!API_ENDPOINT || API_ENDPOINT === "https://your-api-endpoint.com/og-tags") {
    console.warn("[YourMom] API endpoint not configured. Please update API_ENDPOINT in background.js");
    return;
  }

  try {
    const headers = {
      "Content-Type": "application/json"
    };
    
    // Add API key if configured
    if (API_KEY && API_KEY !== "<PUT_YOUR_API_KEY_HERE>") {
      headers["Authorization"] = `Bearer ${API_KEY}`;
    }

    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify(ogTags)
    });

    if (response.ok) {
      console.debug("[YourMom] Successfully sent og tags to API:", response.status);
      const responseData = await response.json();
      console.debug("[YourMom] API response:", responseData);
    } else {
      console.warn("[YourMom] API request failed:", response.status, response.statusText);
    }
  } catch (error) {
    console.warn("[YourMom] Error sending og tags to API:", error);
  }
}

// Debounce so we don't hammer the API while pages load
let debounceTimer;
async function onTabEvent() {
  console.log("[YourMom] Tab event triggered");
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    const { focusing } = await getFocusState();
    console.log("[YourMom] Focus state:", focusing);
    if (!focusing) {
      console.log("[YourMom] Not focusing, skipping og tag extraction");
      return;
    }

    // Find the active tab in the focused window
    const [active] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!active) {
      console.log("[YourMom] No active tab found");
      return;
    }

    console.log("[YourMom] Processing tab:", active.id, "URL:", active.url);

    try {
      // Extract og tags from the current tab
      const ogTags = await extractOgTagsFromTab(active.id);
      
      if (ogTags) {
        console.log("[YourMom] ===== EXTRACTED OG TAGS =====");
        console.log("Page URL:", ogTags.pageUrl);
        console.log("Page Title:", ogTags.pageTitle);
        console.log("Timestamp:", ogTags.timestamp);
        console.log("");
        console.log("Open Graph Tags:");
        Object.keys(ogTags).forEach(key => {
          if (key.startsWith('og:')) {
            console.log(`  ${key}:`, ogTags[key]);
          }
        });
        console.log("");
        console.log("Additional Meta Tags:");
        if (ogTags.description) console.log("  description:", ogTags.description);
        if (ogTags.keywords) console.log("  keywords:", ogTags.keywords);
        console.log("=====================================");
        
        console.debug("[YourMom] Sending og tags to API:", ogTags);
        await sendOgTagsToAPI(ogTags);
        
        // Store the extracted og tags for display in popup
        const extractionTime = Date.now();
        await chrome.storage.local.set({ 
          lastExtractedOgTags: ogTags,
          lastExtractionTime: extractionTime
        });
        
        // Notify popup if it's open
        try {
          await chrome.runtime.sendMessage({
            type: "OG_TAGS_EXTRACTED",
            ogTags: ogTags,
            extractionTime: extractionTime
          });
        } catch (error) {
          // Popup might not be open, that's okay
          console.debug("[YourMom] Could not send message to popup:", error.message);
        }
      } else {
        console.warn("[YourMom] No og tags extracted from tab:", active.url);
      }
    } catch (error) {
      console.warn("[YourMom] Error processing tab event:", error);
    }
  }, 350);
}

// Listen for tab activation and updates
chrome.tabs.onActivated.addListener(onTabEvent);
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" || changeInfo.title) onTabEvent();
});

// Keep background aware of popup toggles
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "FOCUS_TOGGLED") {
    console.debug("[YourMom] Focus toggled:", msg.focusing);
  }
});
