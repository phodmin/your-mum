// ---------- CONFIG: set your ElevenLabs creds ----------
const ELEVEN_API_KEY = "<PUT_YOUR_XI_API_KEY_HERE>";   // xi-api-key
const ELEVEN_VOICE_ID = "<VOICE_ID>";                  // e.g. Rachel
// Endpoint using text-to-speech streaming; you can swap to any TTS endpoint you prefer.
const ELEVEN_ENDPOINT = (voiceId) =>
  `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
// -------------------------------------------------------

async function getFocusState() {
  return await chrome.storage.local.get({ focusing: false });
}

async function sendToElevenLabs(text) {
  if (!ELEVEN_API_KEY || !ELEVEN_VOICE_ID) return;

  try {
    // Minimal example: request TTS MP3 for the title text.
    const res = await fetch(ELEVEN_ENDPOINT(ELEVEN_VOICE_ID), {
      method: "POST",
      headers: {
        "xi-api-key": ELEVEN_API_KEY,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg"
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_turbo_v2",      // adjust to your account
        voice_settings: { stability: 0.4, similarity_boost: 0.7 }
      })
    });

    // You could play the audio by piping to a new tab or using an HTMLAudioElement in a offscreen doc.
    // For v1, we don't auto-play to avoid spam; just fire-and-forget.
    console.debug("[YourMom] ElevenLabs response:", res.status);
  } catch (e) {
    console.warn("[YourMom] ElevenLabs error:", e);
  }
}

// Debounce so we don't hammer the API while pages load
let debounceTimer;
function onTabEvent() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    const { focusing } = await getFocusState();
    if (!focusing) return;

    // Find the active tab in the focused window
    const [active] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    if (!active || !active.title) return;

    const title = active.title;
    // Send the active tab title to ElevenLabs
    await sendToElevenLabs(`You are now on tab: ${title}`);
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
