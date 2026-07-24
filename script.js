/* ==========================================================================
   ThorPay — app logic
   Works on both index.html (landing, wallet connect only) and app.html
   (full dashboard: balances, swap, bridge, send, history).
   ========================================================================== */

const CONFIG = {
  chainIdHex: "0x4CEF52",        // 5042002 decimal — Arc Testnet
  chainIdDec: 5042002,
  chainName: "Arc Testnet",
  rpcUrls: ["https://rpc.testnet.arc.network"],
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  blockExplorerUrls: ["https://testnet.arcscan.app"],

  // Verified from https://docs.arc.io/arc/references/contract-addresses
  USDC_ERC20: "0x3600000000000000000000000000000000000000", // 6 decimals
  EURC_ERC20: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",  // 6 decimals

  // Verified from Circle's own arc-defi-lend-borrow sample repo (github.com/circlefin).
  // No public self-serve faucet yet — distributed via Circle Discord / team demo wallet.
  CIRBTC_ERC20: "0xf0C4a4CE82A5746AbAAd9425360Ab04fbBA432BF", // 8 decimals
  CIRBTC_HAS_FAUCET: false,

  // Circle Iris attestation API (testnet) — used only as a status reference
  IRIS_API: "https://iris-api-sandbox.circle.com",

  // Destination chains for Bridge — verified USDC addresses from Circle's
  // circlefin/skills reference (github.com/circlefin/skills)
  bridgeDestinations: {
    ethSepolia: {
      name: "Ethereum Sepolia",
      appKitChain: "Ethereum_Sepolia",
      chainIdHex: "0xaa36a7",
      usdcAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
      rpc: "https://ethereum-sepolia-rpc.publicnode.com",
      explorer: "https://sepolia.etherscan.io"
    },
    baseSepolia: {
      name: "Base Sepolia",
      appKitChain: "Base_Sepolia",
      chainIdHex: "0x14a34",
      usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      rpc: "https://base-sepolia-rpc.publicnode.com",
      explorer: "https://sepolia.basescan.org"
    }
  }
};

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

let provider, signer, userAddress;
let history = [];
let currentBalances = { USDC: 0, EURC: 0, CIRBTC: 0 };

/* -------------------------------------------------------------------------
   Small formatting / validation helpers
   ------------------------------------------------------------------------- */
function fmt(n, decimals = 2) {
  n = Number(n);
  if (!isFinite(n) || n < 0) n = 0;
  return n.toFixed(decimals);
}

function sanitizeAmountInput(inputEl) {
  let v = inputEl.value;
  if (v === "") return;
  let n = Number(v);
  if (!isFinite(n) || n < 0) n = 0;
  n = Math.round(n * 1e6) / 1e6; // avoid runaway decimal precision artifacts
  inputEl.value = n;
}

function validateAmount(amountStr, maxBalance) {
  const n = Number(amountStr);
  if (!amountStr || isNaN(n) || n <= 0) return { ok: false, msg: "Enter an amount." };
  if (n > maxBalance) return { ok: false, msg: `Insufficient balance — you have ${fmt(maxBalance, 4)} available.` };
  return { ok: true };
}

function setText(id, txt) {
  const el = document.getElementById(id);
  if (el) el.innerText = txt;
}

/* -------------------------------------------------------------------------
   Tab switching (app.html only)
   ------------------------------------------------------------------------- */
document.querySelectorAll("[data-tab]").forEach(el => {
  el.addEventListener("click", () => {
    const tab = el.dataset.tab;
    document.querySelectorAll("nav a[data-tab]").forEach(a => a.classList.toggle("active", a.dataset.tab === tab));
    document.querySelectorAll(".tab-btn").forEach(a => a.classList.toggle("active", a.dataset.tab === tab));
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
    const panel = document.getElementById("panel-" + tab);
    if (panel) panel.classList.add("active");
  });
});

/* -------------------------------------------------------------------------
   Wallet connect / disconnect / network pill
   ------------------------------------------------------------------------- */
const connectBtn = document.getElementById("connectBtn");
const disconnectBtn = document.getElementById("disconnectBtn");
const netPill = document.getElementById("networkPill");
const netLabel = document.getElementById("networkLabel");
const switchBtn = document.getElementById("switchBtn");

if (connectBtn) connectBtn.addEventListener("click", connectWallet);
if (disconnectBtn) disconnectBtn.addEventListener("click", disconnectWallet);
if (switchBtn) switchBtn.addEventListener("click", () => ensureArcNetwork());

async function connectWallet() {
  if (!window.ethereum) {
    alert("MetaMask not found. Please install the MetaMask browser extension first.");
    return;
  }
  try {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    await ensureArcNetwork();
    await initSession();
  } catch (err) {
    console.error(err);
    alert("Wallet connection failed: " + (err.message || err));
  }
}

async function initSession() {
  provider = new ethers.providers.Web3Provider(window.ethereum, "any");
  signer = provider.getSigner();
  userAddress = await signer.getAddress();

  if (connectBtn) connectBtn.innerText = userAddress.slice(0, 6) + "..." + userAddress.slice(-4);
  if (disconnectBtn) disconnectBtn.style.display = "inline-block";

  const welcome = document.getElementById("welcomeMsg");
  if (welcome) welcome.innerText = "Welcome back";

  ["swapBtn", "bridgeBtn", "sendBtn"].forEach(id => setBtnEnabled(id, true));
  setBtnLabel("swapBtn", "Exchange");
  setBtnLabel("bridgeBtn", "Bridge");
  setBtnLabel("sendBtn", "Send");

  await updateNetworkPill();
  await refreshBalances();
  loadHistoryForAddress(userAddress);
}

function disconnectWallet() {
  if (window.ethereum && window.ethereum.request) {
    window.ethereum.request({
      method: "wallet_revokePermissions",
      params: [{ eth_accounts: {} }]
    }).catch(() => { /* older MetaMask versions don't support this — ignore */ });
  }

  provider = null; signer = null; userAddress = null;
  history = [];

  if (connectBtn) connectBtn.innerText = "Connect Wallet";
  if (disconnectBtn) disconnectBtn.style.display = "none";
  const welcome = document.getElementById("welcomeMsg");
  if (welcome) welcome.innerText = "Welcome to ThorPay";

  ["swapBtn", "bridgeBtn", "sendBtn"].forEach(id => setBtnEnabled(id, false));
  setBtnLabel("swapBtn", "Connect wallet to swap");
  setBtnLabel("bridgeBtn", "Connect wallet to bridge");
  setBtnLabel("sendBtn", "Connect wallet to send");

  setText("usdcBal", "0.00"); setText("eurcBal", "0.00"); setText("cirbtcBal", "0.00");
  setText("totalBalance", "$0.00");
  renderHistory();
  updateNetworkPill();
}

function setBtnEnabled(id, enabled) {
  const btn = document.getElementById(id);
  if (btn) btn.disabled = !enabled;
}
function setBtnLabel(id, label) {
  const btn = document.getElementById(id);
  if (btn) btn.innerText = label;
}

async function ensureArcNetwork() {
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: CONFIG.chainIdHex }]
    });
  } catch (switchErr) {
    if (switchErr.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: CONFIG.chainIdHex,
          chainName: CONFIG.chainName,
          rpcUrls: CONFIG.rpcUrls,
          nativeCurrency: CONFIG.nativeCurrency,
          blockExplorerUrls: CONFIG.blockExplorerUrls
        }]
      });
    } else {
      throw switchErr;
    }
  }
}

async function updateNetworkPill() {
  if (!netPill) return;
  if (!window.ethereum || !userAddress) {
    netPill.classList.remove("connected");
    if (netLabel) netLabel.innerText = "Not connected";
    if (switchBtn) switchBtn.style.display = "none";
    return;
  }
  try {
    const chainId = await window.ethereum.request({ method: "eth_chainId" });
    if (chainId.toLowerCase() === CONFIG.chainIdHex.toLowerCase()) {
      netPill.classList.add("connected");
      if (netLabel) netLabel.innerText = "Arc Testnet";
      if (switchBtn) switchBtn.style.display = "none";
    } else {
      netPill.classList.remove("connected");
      if (netLabel) netLabel.innerText = "Wrong network";
      if (switchBtn) switchBtn.style.display = "inline-block";
    }
  } catch (e) {
    console.warn("chainId check failed", e);
  }
}

/* -------------------------------------------------------------------------
   Balances — always read through the ERC-20 interface, per Arc's guidance.
   ------------------------------------------------------------------------- */
async function tokenBalance(tokenAddress) {
  const c = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
  const [raw, decimals] = await Promise.all([c.balanceOf(userAddress), c.decimals()]);
  return Number(ethers.utils.formatUnits(raw, decimals));
}

async function refreshBalances() {
  if (!provider || !userAddress) return;
  try {
    const [usdc, eurc, cirbtc] = await Promise.all([
      tokenBalance(CONFIG.USDC_ERC20),
      tokenBalance(CONFIG.EURC_ERC20),
      tokenBalance(CONFIG.CIRBTC_ERC20).catch(() => 0)
    ]);
    currentBalances = { USDC: usdc, EURC: eurc, CIRBTC: cirbtc };

    setText("usdcBal", fmt(usdc, 2));
    setText("eurcBal", fmt(eurc, 2));
    setText("cirbtcBal", fmt(cirbtc, 6));
    setText("totalBalance", "$" + fmt(usdc, 2));
    setText("swapFromBal", "Balance: " + fmt(usdc, 4));
    setText("bridgeFromBal", "Balance: " + fmt(usdc, 4));
    setText("sendBal", "Balance: " + fmt(usdc, 4));

    await refreshDestinationBalance();
  } catch (e) {
    console.error("balance fetch failed", e);
  }
}

// Read-only USDC balance check on each destination testnet via public RPC —
// no wallet switch needed — so users can see whether a bridge actually landed.
const DEST_BAL_ELEMENT_IDS = { ethSepolia: "ethSepoliaBal", baseSepolia: "baseSepoliaBal" };

async function refreshDestinationBalance() {
  if (!userAddress) return;
  await Promise.all(Object.entries(CONFIG.bridgeDestinations).map(async ([key, dest]) => {
    const elId = DEST_BAL_ELEMENT_IDS[key];
    if (!elId) return;
    try {
      const roProvider = new ethers.providers.JsonRpcProvider(dest.rpc);
      const c = new ethers.Contract(dest.usdcAddress, ERC20_ABI, roProvider);
      const [raw, decimals] = await Promise.all([c.balanceOf(userAddress), c.decimals()]);
      const bal = Number(ethers.utils.formatUnits(raw, decimals));
      setText(elId, fmt(bal, 4));
    } catch (e) {
      setText(elId, "—");
    }
  }));
}

/* -------------------------------------------------------------------------
   Amount input guarding — no negatives, no exceeding balance
   ------------------------------------------------------------------------- */
function wireAmountField(inputId, tokenGetter, balanceMsgId, actionBtnId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.addEventListener("input", () => {
    sanitizeAmountInput(input);
    const token = tokenGetter ? tokenGetter() : "USDC";
    const bal = currentBalances[token] ?? currentBalances.USDC;
    const check = validateAmount(input.value, bal);
    const btn = document.getElementById(actionBtnId);
    const balEl = balanceMsgId ? document.getElementById(balanceMsgId) : null;
    if (input.value !== "" && !check.ok && Number(input.value) > 0) {
      if (balEl) balEl.innerText = check.msg;
      if (balEl) balEl.classList.add("balance-warn");
      if (btn) btn.disabled = true;
    } else {
      if (balEl) balEl.classList.remove("balance-warn");
      if (balEl) balEl.innerText = "Balance: " + fmt(bal, 4);
      if (btn && signer) btn.disabled = false;
    }
  });
}
wireAmountField("swapFromAmt", () => document.getElementById("swapFromToken").value, "swapFromBal", "swapBtn");
wireAmountField("bridgeFromAmt", () => "USDC", "bridgeFromBal", "bridgeBtn");
wireAmountField("sendAmt", () => document.getElementById("sendToken").value, "sendBal", "sendBtn");

/* -------------------------------------------------------------------------
   Percentage quick-fill buttons
   ------------------------------------------------------------------------- */
document.querySelectorAll(".pct span").forEach(el => {
  el.addEventListener("click", () => {
    if (!userAddress) return;
    const panel = el.closest(".panel").id;
    const pct = Number(el.dataset.pct) / 100;
    if (panel === "panel-swap") {
      const token = document.getElementById("swapFromToken").value;
      const val = (currentBalances[token] ?? 0) * pct;
      const input = document.getElementById("swapFromAmt");
      input.value = fmt(val, 6);
      input.dispatchEvent(new Event("input"));
    }
    if (panel === "panel-send") {
      const token = document.getElementById("sendToken").value;
      const val = (currentBalances[token] ?? 0) * pct;
      const input = document.getElementById("sendAmt");
      input.value = fmt(val, 6);
      input.dispatchEvent(new Event("input"));
    }
  });
});

/* -------------------------------------------------------------------------
   Swap flip
   ------------------------------------------------------------------------- */
const swapFlip = document.getElementById("swapFlip");
if (swapFlip) {
  swapFlip.addEventListener("click", () => {
    const a = document.getElementById("swapFromToken");
    const b = document.getElementById("swapToToken");
    const tmp = a.value; a.value = b.value; b.value = tmp;
  });
}

/* -------------------------------------------------------------------------
   Swap — Circle's App Kit FAQ (community.arc.io, July 2026) says browser-
   wallet Swap isn't supported yet ("Swap requires a server-side adapter...
   Client-side Swap is a known limitation the team is actively working on").
   Rather than assume that and fake a result, this makes the real call with
   whatever Kit Key the person pastes in (their own free key from
   console.circle.com, kept only in this browser's localStorage) and shows
   exactly what Circle's SDK returns — including the error, if it's still
   unsupported by the time you're reading this.
   ------------------------------------------------------------------------- */
const kitKeyInput = document.getElementById("kitKeyInput");
if (kitKeyInput) {
  const saved = localStorage.getItem("thorpay_kit_key");
  if (saved) kitKeyInput.value = saved;
  kitKeyInput.addEventListener("change", () => {
    localStorage.setItem("thorpay_kit_key", kitKeyInput.value.trim());
  });
}

const swapBtn = document.getElementById("swapBtn");
if (swapBtn) {
  swapBtn.addEventListener("click", async () => {
    const statusEl = document.getElementById("swapStatus");
    if (!signer) { statusEl.className = "status err"; statusEl.innerText = "Connect your wallet first."; return; }

    const amt = document.getElementById("swapFromAmt").value;
    const tokenIn = document.getElementById("swapFromToken").value;
    const tokenOut = document.getElementById("swapToToken").value;
    const check = validateAmount(amt, currentBalances[tokenIn] ?? 0);
    if (!check.ok) { statusEl.className = "status err"; statusEl.innerText = check.msg; return; }

    const kitKey = kitKeyInput ? kitKeyInput.value.trim() : "";
    if (!kitKey) {
      statusEl.className = "status err";
      statusEl.innerText = "Paste a free Kit Key from console.circle.com first (Swap requires one; Bridge and Send don't).";
      return;
    }

    try {
      swapBtn.disabled = true;
      statusEl.className = "status"; statusEl.innerText = "Loading Circle App Kit...";
      await initAppKit();

      statusEl.innerText = "Requesting a swap quote...";
      const estimate = await appKit.estimateSwap({
        from: { adapter: appKitAdapter, chain: "Arc_Testnet" },
        tokenIn, tokenOut, amountIn: amt,
        config: { kitKey }
      });
      setText("swapEstOut", fmt(estimate.estimatedOutput.amount, 4) + " " + tokenOut);
      statusEl.innerText = `Quote: ~${estimate.estimatedOutput.amount} ${tokenOut}. Confirm in MetaMask...`;

      const result = await appKit.swap({
        from: { adapter: appKitAdapter, chain: "Arc_Testnet" },
        tokenIn, tokenOut, amountIn: amt,
        config: { kitKey }
      });

      statusEl.className = "status ok";
      statusEl.innerText = `Swap complete. Tx: ${result.txHash}`;
      addHistory("SWAP", amt + " " + tokenIn + " → " + tokenOut, result.txHash);
      await refreshBalances();
    } catch (err) {
      console.error(err);
      statusEl.className = "status err";
      statusEl.innerText = "Swap failed: " + (err.message || err) +
        " — as of Circle's July 2026 App Kit FAQ, client-side Swap from a browser wallet was still " +
        "listed as a known limitation, so this may be exactly that.";
    } finally {
      swapBtn.disabled = false;
    }
  });
}

/* -------------------------------------------------------------------------
   Bridge — Circle App Kit (@circle-fin/app-kit), loaded on demand from a
   CDN so this stays a plain static site with no build step. kit.bridge()
   runs the full CCTP flow — approve, burn, wait for attestation, and mint
   on the destination chain — from a single call, confirmed to work with
   browser wallets (MetaMask) in Circle's App Kit FAQ.
   ------------------------------------------------------------------------- */
let appKit, appKitAdapter;

async function initAppKit() {
  if (appKit) return;
  const [{ AppKit }, { createViemAdapterFromProvider }] = await Promise.all([
    import("https://esm.sh/@circle-fin/app-kit@latest"),
    import("https://esm.sh/@circle-fin/adapter-viem-v2@latest")
  ]);
  appKit = new AppKit();
  appKitAdapter = await createViemAdapterFromProvider({ provider: window.ethereum });
}

const bridgeBtn = document.getElementById("bridgeBtn");
if (bridgeBtn) {
  bridgeBtn.addEventListener("click", async () => {
    const statusEl = document.getElementById("bridgeStatus");
    const progressEl = document.getElementById("bridgeProgress");
    if (!signer) { statusEl.className = "status err"; statusEl.innerText = "Connect your wallet first."; return; }

    const amt = document.getElementById("bridgeFromAmt").value;
    const check = validateAmount(amt, currentBalances.USDC ?? 0);
    if (!check.ok) { statusEl.className = "status err"; statusEl.innerText = check.msg; return; }

    const destKey = document.getElementById("bridgeToChain").value;
    const dest = CONFIG.bridgeDestinations[destKey];

    try {
      bridgeBtn.disabled = true;
      progressEl.style.display = "block";
      statusEl.className = "status";
      statusEl.innerText = "Loading Circle App Kit...";
      await initAppKit();

      progressEl.innerText = "Bridging via CCTP — approve, burn, attestation and mint all run automatically.\n" +
        "MetaMask may prompt you to switch networks partway through — that's expected.";
      statusEl.innerText = "Waiting for MetaMask confirmations...";

      const result = await appKit.bridge({
        from: { adapter: appKitAdapter, chain: "Arc_Testnet" },
        to: { adapter: appKitAdapter, chain: dest.appKitChain },
        amount: amt
      });

      progressEl.innerText = (result.steps || [])
        .map(s => `${s.name}: ${s.state}${s.txHash ? " (" + s.txHash.slice(0, 10) + "...)" : ""}`)
        .join("\n");

      if (result.state === "success") {
        statusEl.className = "status ok";
        statusEl.innerText = `Bridge complete — ${amt} USDC delivered on ${dest.name}.`;
        const txHash = (result.steps || []).find(s => s.txHash)?.txHash || "";
        addHistory("BRIDGE", amt + " USDC → " + dest.name, txHash);
      } else {
        statusEl.className = "status err";
        statusEl.innerText = "Bridge finished in state: " + result.state + ". Check the step details below.";
      }
      await refreshBalances();
    } catch (err) {
      console.error(err);
      statusEl.className = "status err";
      statusEl.innerText = "Error: " + (err.message || err);
    } finally {
      bridgeBtn.disabled = false;
    }
  });
}

/* -------------------------------------------------------------------------
   Send — real ERC-20 transfer (USDC or EURC) through the ERC-20 interface.
   ------------------------------------------------------------------------- */
const sendBtn = document.getElementById("sendBtn");
if (sendBtn) {
  sendBtn.addEventListener("click", async () => {
    const statusEl = document.getElementById("sendStatus");
    if (!signer) { statusEl.className = "status err"; statusEl.innerText = "Connect your wallet first."; return; }

    const to = document.getElementById("sendTo").value.trim();
    const amt = document.getElementById("sendAmt").value;
    const tokenSymbol = document.getElementById("sendToken").value;

    if (!ethers.utils.isAddress(to)) { statusEl.className = "status err"; statusEl.innerText = "Enter a valid address."; return; }
    const check = validateAmount(amt, currentBalances[tokenSymbol] ?? 0);
    if (!check.ok) { statusEl.className = "status err"; statusEl.innerText = check.msg; return; }

    const tokenAddress = tokenSymbol === "USDC" ? CONFIG.USDC_ERC20 : CONFIG.EURC_ERC20;

    try {
      statusEl.className = "status"; statusEl.innerText = "Waiting for MetaMask confirmation...";
      const c = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
      const decimals = await c.decimals();
      const tx = await c.transfer(to, ethers.utils.parseUnits(amt, decimals));
      await tx.wait();

      statusEl.className = "status ok"; statusEl.innerText = "Sent! Tx: " + tx.hash;
      addHistory("SEND", amt + " " + tokenSymbol + " → " + to.slice(0, 6) + "..." + to.slice(-4), tx.hash);
      await refreshBalances();
    } catch (err) {
      console.error(err);
      statusEl.className = "status err"; statusEl.innerText = "Error: " + (err.message || err);
    }
  });
}

/* -------------------------------------------------------------------------
   History — persisted in localStorage per address, so it survives
   disconnect/reconnect (this is a plain static site, not a sandboxed
   artifact preview, so localStorage is safe to use here).
   ------------------------------------------------------------------------- */
function historyKey(addr) { return "thorpay_history_" + addr.toLowerCase(); }

function loadHistoryForAddress(addr) {
  try {
    const raw = localStorage.getItem(historyKey(addr));
    history = raw ? JSON.parse(raw) : [];
  } catch (e) {
    history = [];
  }
  renderHistory();
}

function saveHistory() {
  if (!userAddress) return;
  try { localStorage.setItem(historyKey(userAddress), JSON.stringify(history)); } catch (e) { /* ignore quota errors */ }
}

function addHistory(type, desc, txHash) {
  history.unshift({ type, desc, txHash, time: new Date().toLocaleString() });
  saveHistory();
  renderHistory();
}

function renderHistory() {
  const el = document.getElementById("historyList");
  if (!el) return;
  if (history.length === 0) {
    el.innerHTML = '<div class="status">No transactions yet.</div>';
    return;
  }
  el.innerHTML = history.map(h => `
    <div class="hist-item">
      <div class="htype ${h.type}">${h.type}</div>
      <div class="hamt">${h.desc}</div>
      <div style="color:var(--muted);font-size:11px;margin-top:4px;">${h.time}</div>
      ${h.txHash ? `<a href="${CONFIG.blockExplorerUrls[0]}/tx/${h.txHash}" target="_blank">View on explorer</a>` : ""}
    </div>
  `).join("");
}

/* -------------------------------------------------------------------------
   React to account/network changes without a hard page reload
   ------------------------------------------------------------------------- */
if (window.ethereum) {
  window.ethereum.on("accountsChanged", async (accounts) => {
    if (!accounts || accounts.length === 0) {
      disconnectWallet();
    } else if (userAddress) {
      await initSession();
    }
  });
  window.ethereum.on("chainChanged", async () => {
    await updateNetworkPill();
    if (userAddress) {
      provider = new ethers.providers.Web3Provider(window.ethereum, "any");
      signer = provider.getSigner();
      await refreshBalances();
    }
  });
}

// Silently restore a previously-approved connection on page load, without
// prompting MetaMask again.
(async function restoreSession() {
  if (!window.ethereum) { updateNetworkPill(); return; }
  try {
    const accounts = await window.ethereum.request({ method: "eth_accounts" });
    if (accounts && accounts.length > 0) {
      await initSession();
    } else {
      updateNetworkPill();
    }
  } catch (e) {
    updateNetworkPill();
  }
})();
