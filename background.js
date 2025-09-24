// ---------- CONFIG: ElevenLabs API ----------
const ELEVENLABS_API_KEY = "ed287bb4b34fd28bc81a36f191ec57992ab85c1a9bce9938842d23f9f3449dda";
const ELEVENLABS_VOICE_ID = "PQ5ojWHyqC0QVkjU3pNe";
const ELEVENLABS_API_URL = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`;
const FOCUS_MESSAGE = "YO Mama is watching you, focus";
// -------------------------------------------------------

async function getFocusState() {
  return await chrome.storage.local.get({ focusing: false });
}

async function generateAndPlaySpeech(text, tabId) {
  try {
    console.log("[YourMom] Generating speech for:", text);
    
    const response = await fetch(ELEVENLABS_API_URL, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text: text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5
        }
      })
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status} ${response.statusText}`);
    }

    const audioBlob = await response.blob();
    const audioArrayBuffer = await audioBlob.arrayBuffer();
    const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(audioArrayBuffer)));
    
    // Send audio data to content script to play
    try {
      await chrome.tabs.sendMessage(tabId, {
        action: 'playAudio',
        audioData: audioBase64,
        mimeType: 'audio/mpeg'
      });
      console.log("[YourMom] Audio sent to content script for playback");
    } catch (error) {
      console.warn("[YourMom] Could not send audio to content script:", error.message);
      // Fallback: try to inject and play audio directly
      await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: playAudioFromBase64,
        args: [audioBase64, 'audio/mpeg']
      });
    }
    
  } catch (error) {
    console.error("[YourMom] Error generating/playing speech:", error);
    throw error;
  }
}

// Function to be injected into the page to play audio
function playAudioFromBase64(base64Data, mimeType) {
  try {
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mimeType });
    const audioUrl = URL.createObjectURL(blob);
    
    const audio = new Audio(audioUrl);
    audio.volume = 0.8;
    
    audio.onended = () => {
      URL.revokeObjectURL(audioUrl);
    };
    
    audio.play().catch(error => {
      console.error('Error playing audio:', error);
      URL.revokeObjectURL(audioUrl);
    });
  } catch (error) {
    console.error('Error in playAudioFromBase64:', error);
  }
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

    // Check what message to play based on current site
    const currentUrl = active.url;
    const allowedSites = ['elevenlabs.io', 'docs.google.com', 'wikipedia.org'];
    const isOnAllowedSite = allowedSites.some(site => currentUrl.includes(site));
    
    if (isOnAllowedSite) {
      console.log("[YourMom] User is on an allowed site, no sound needed");
    } else {
      // Determine custom message based on site
      let messageToPlay = FOCUS_MESSAGE; // Default message
      
      if (currentUrl.includes('youtube.com')) {
        messageToPlay = "stop watching dumb youtube videos";
        console.log("[YourMom] User is on YouTube, playing custom message");
      } else if (currentUrl.includes('ycombinator.com')) {
        messageToPlay = "Dont go to Y Combinator, join EF";
        console.log("[YourMom] User is on Y Combinator, playing custom message");
      } else if (currentUrl.includes('mama-roast-your-focus.lovable.app')) {
        messageToPlay = "Stop watching me";
        console.log("[YourMom] User is on mama-roast-your-focus.lovable.app, playing custom message");
      } else if (currentUrl.includes('x.com/home')) {
        messageToPlay = "Stop Doomscrolling you wanna be founder";
        console.log("[YourMom] User is on x.com/home, playing custom message");
      } else {
        console.log("[YourMom] User is on other site, playing default focus reminder");
      }
      
      try {
        await generateAndPlaySpeech(messageToPlay, active.id);
        console.log("[YourMom] Played custom message:", messageToPlay);
      } catch (error) {
        console.error("[YourMom] Failed to play custom message:", error);
      }
    }


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
