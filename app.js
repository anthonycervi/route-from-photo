const START = "701 National Ave, Vancouver, BC";

const els = {
  file: document.getElementById("file"),
  runBtn: document.getElementById("runBtn"),
  clearBtn: document.getElementById("clearBtn"),
  optBtn: document.getElementById("optBtn"),
  addresses: document.getElementById("addresses"),
  status: document.getElementById("status"),
  ordered: document.getElementById("ordered"),
  links: document.getElementById("links"),
  qr: document.getElementById("qr"),
};

function setStatus(msg) {
  els.status.textContent = msg;
}

function clearOutput() {
  els.ordered.innerHTML = "";
  els.links.innerHTML = "";
}

function normalizeLines(text) {
  return text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
}

function filterAddressLines(lines) {
  return lines.filter(line => {
    const hasNumber = /\b\d{1,6}\b/.test(line);
    const hasStreetWord = /(st|street|ave|avenue|rd|road|blvd|boulevard|dr|drive|way|cres|court|ct|pl|place|lane|ln|terr|terrace|pkwy|parkway)/i.test(line);
    return hasNumber && (hasStreetWord || /vancouver|bc/i.test(line));
  });
}

function dedupePreserveOrder(arr) {
  const seen = new Set();
  return arr.filter(a => !seen.has(a.toLowerCase()) && seen.add(a.toLowerCase()));
}

async function ocrImage(file) {
  setStatus("Reading image…");
  const { data } = await Tesseract.recognize(file, "eng");
  return data.text || "";
}

async function optimizeFromList(addressList) {
  clearOutput();
  setStatus("Optimizing route…");

  const res = await fetch("/functions/optimize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ origin: START, stops: addressList }),
  });

  const json = await res.json();
  if (!res.ok) {
    setStatus(`Error: ${json?.error || "Unknown error"}`);
    return;
  }

  setStatus(`Done.`);
  els.ordered.innerHTML = json.ordered_stops.map(s => `<li>${s}</li>`).join("");

  els.links.innerHTML = "";
  json.maps_links.forEach((url, i) => {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.textContent = json.maps_links.length === 1 ? "Open in Google Maps" : `Open Part ${i+1}`;
    els.links.appendChild(a);
  });
}

els.runBtn.onclick = async () => {
  if (!els.file.files[0]) return setStatus("Choose an image first.");

  const text = await ocrImage(els.file.files[0]);
  const addr = dedupePreserveOrder(filterAddressLines(normalizeLines(text)));

  els.addresses.value = addr.join("\n");
  if (addr.length >= 3) optimizeFromList(addr);
  else setStatus("Could not find enough addresses.");
};

els.optBtn.onclick = () => {
  const addr = dedupePreserveOrder(normalizeLines(els.addresses.value));
  if (addr.length >= 3) optimizeFromList(addr);
  else setStatus("Enter at least 3 addresses.");
};

els.clearBtn.onclick = () => {
  els.file.value = "";
  els.addresses.value = "";
  clearOutput();
  setStatus("Cleared.");
};

window.onload = () => {
  QRCode.toCanvas(els.qr, window.location.href, { width: 220 });
};
