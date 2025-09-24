// ---------- tiny helpers ----------
const $ = (id) => document.getElementById(id);

function format(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

// Promise-safe storage wrappers (MV3 should have Promises, but some Chrome builds are gremlins)
function sget(keys) {
  return new Promise((res) => chrome.storage.local.get(keys, (out) => res(out || {})));
}
function sset(obj) {
  return new Promise((res) => chrome.storage.local.set(obj, () => res()));
}

let tick = null;

// ---------- UI state ----------
async function loadState() {
  const out = await sget(["focusing","taskName","taskDesc","startTs"]);
  const focusing = !!out.focusing;
  const taskName = out.taskName || "";
  const taskDesc = out.taskDesc || "";
  const startTs = Number(out.startTs) || null;

  console.log("[YourMum] Loading saved state:", { focusing, taskName, taskDesc, startTs });

  $("taskName").value = taskName;
  $("taskDesc").value = taskDesc;

  console.log("[YourMum] Fields restored to UI");
  setUI(focusing, startTs);
}

function setUI(focusing, startTs) {
  console.log("[YourMum] setUI called with:", { focusing, startTs, isFinite: Number.isFinite(startTs) });
  
  const btn = $("toggle");
  const timer = $("timer");
  const meta = $("meta");
  
  console.log("[YourMum] Elements found:", { btn: !!btn, timer: !!timer, meta: !!meta });
  
  btn.textContent = focusing ? "Stop focusing" : "Start focusing";
  btn.className = focusing ? "stop" : "start";

  if (tick) { 
    console.log("[YourMum] Clearing existing timer");
    clearInterval(tick); 
    tick = null; 
  }

  if (focusing && Number.isFinite(startTs) && startTs > 0) {
    console.log("[YourMum] STARTING TIMER! startTs:", startTs, "current time:", Date.now());
    meta.textContent = "Focus mode is ON. Tab changes will ping ElevenLabs.";
    
    const update = () => { 
      const elapsed = format(Date.now() - startTs);
      console.log("[YourMum] Timer update:", elapsed);
      timer.textContent = elapsed; 
    };
    
    update(); // immediate update
    tick = setInterval(update, 1000);
    console.log("[YourMum] Timer interval set:", tick);
  } else {
    console.log("[YourMum] NOT starting timer. focusing:", focusing, "startTs:", startTs, "isFinite:", Number.isFinite(startTs));
    timer.textContent = "00:00:00";
    meta.textContent = "Focus mode is OFF.";
  }
}

async function saveFields() {
  const taskName = $("taskName").value.trim();
  const taskDesc = $("taskDesc").value.trim();
  console.log("[YourMum] Saving fields:", { taskName, taskDesc });
  await sset({
    taskName: taskName,
    taskDesc: taskDesc
  });
  console.log("[YourMum] Fields saved successfully");
}

// ---------- events ----------
document.addEventListener("DOMContentLoaded", async () => {
  console.log("[YourMom] DOM loaded");
  // sanity check elements exist
  ["taskName","taskDesc","toggle","timer","meta"].forEach(id => {
    if (!$(id)) console.warn(`[YourMom] Missing element #${id}`);
  });

  await loadState();

  $("taskName").addEventListener("input", saveFields);
  $("taskDesc").addEventListener("input", saveFields);

  $("toggle").addEventListener("click", async () => {
    console.log("[YourMom] Toggle clicked");
    const store = await sget(["focusing","startTs"]);
    const nowFocusing = !store.focusing;

    // require a task name to start
    const name = $("taskName").value.trim();
    if (nowFocusing && !name) {
      $("taskName").focus();
      $("taskName").placeholder = "Give it a name first";
      return;
    }

    const startTs = nowFocusing ? Date.now() : null;

    await sset({
      focusing: nowFocusing,
      startTs,
      taskName: name,
      taskDesc: $("taskDesc").value.trim()
    });

    chrome.runtime.sendMessage({ type: "FOCUS_TOGGLED", focusing: nowFocusing });
    setUI(nowFocusing, startTs);
  });
});

