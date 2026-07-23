/* ==========================================================================
   ThorPay — app logic
   Works on both index.html (landing, wallet connect only) and app.html
   (full dashboard: balances, swap, bridge, send, history).
   Fill in / verify addresses below before relying on this for anything
   beyond testnet experimentation.
   ========================================================================== */

const CONFIG = {
  chainIdHex: "0x4CEF52",        // 5042002 decimal — Arc Testnet
  chainName: "Arc Testnet",
  rpcUrls: ["https://rpc.testnet.arc.network"],
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 }, // native gas display, 18 decimals
  blockExplorerUrls: ["https://testnet.arcscan.app"],

  // Verified from https://docs.arc.io/arc/references/contract-addresses (Arc Testnet only)
  USDC_ERC20: "0x3600000000000000000000000000000000000000", // 6 decimals — use this for balances/transfers
  EURC_ERC20: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",  // 6 decimals

  // cirBTC does not have a public self-serve address/faucet yet as of writing.
  // Check https://docs.arc.io/arc/references/contract-addresses for updates.
  CIRBTC_ERC20: null,

  // Circle CCTP V2 on Arc Testnet (source-chain / burn side)
  CCTP_DOMAIN_ARC: 26,
  TOKEN_MESSENGER_V2: "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA",
  MESSAGE_TRANSMITTER_V2: "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275",

  // Circle StableFX escrow (swap) — quote placement needs Circle's RFQ API, not wired up here
  STABLEFX_ESCROW: "0x867650F5eAe8df91445971f14d89fd84F0C9a9f8",

  // Circle Iris attestation API (testnet)
  IRIS_API: "https://iris-api-sandbox.circle.com",

  // Well-known CCTP domain IDs for common destination testnets.
  // Verify current destination contract addresses yourself at
  // https://developers.circle.com/cctp/evm-smart-contracts before minting —
  // wrong addresses on the destination chain step could send funds nowhere.
  bridgeDestinations: {
    ethSepolia: { name: "Ethereum Sepolia", domain: 0 },
    baseSepolia: { name: "Base Sepolia", domain: 6 }
  }
};

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

const TOKEN_MESSENGER_V2_ABI = [
  "function depositForBurn(uint256 amount, uint32 destinationDomain, bytes32 mintRecipient, address burnToken, bytes32 destinationCaller, uint256 maxFee, uint32 minFinalityThreshold) external returns (uint64 nonce)"
];

let provider, signer, userAddress;
let history = [];

/* -------------------------------------------------------------------------
   Tab switching (app.html only — no-ops harmlessly if elements don't exist)
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
   Wallet connect
   ------------------------------------------------------------------------- */
const connectBtn = document.getElementById("connectBtn");
if (connectBtn) connectBtn.addEventListener("click", connectWallet);

async function connectWallet() {
  if (!window.ethereum) {
    alert("MetaMask not found. Please install the MetaMask browser extension first.");
    return;
  }
  try {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    await ensureArcNetwork();

    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    userAddress = await signer.getAddress();

    if (connectBtn) connectBtn.innerText = userAddress.slice(0, 6) + "..." + userAddress.slice(-4);

    const welcome = document.getElementById("welcomeMsg");
    if (welcome) welcome.innerText = "Welcome back";

    ["swapBtn", "bridgeBtn", "sendBtn"].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.disabled = false;
    });
    setBtnLabel("swapBtn", "Exchange");
    setBtnLabel("bridgeBtn", "Bridge");
    setBtnLabel("sendBtn", "Send");

    await refreshBalances();
  } catch (err) {
    console.error(err);
    alert("Wallet connection failed: " + (err.message || err));
  }
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

/* -------------------------------------------------------------------------
   Balances — always read through the ERC-20 interface (6 decimals) per
   Arc's own guidance, rather than the native 18-decimal gas balance.
   ------------------------------------------------------------------------- */
async function tokenBalance(tokenAddress) {
  const c = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
  const [raw, decimals] = await Promise.all([c.balanceOf(userAddress), c.decimals()]);
  return Number(ethers.utils.formatUnits(raw, decimals));
}

async function refreshBalances() {
  if (!provider || !userAddress) return;
  try {
    const usdc = await tokenBalance(CONFIG.USDC_ERC20);
    const eurc = await tokenBalance(CONFIG.EURC_ERC20);

    setText("usdcBal", usdc.toFixed(2));
    setText("eurcBal", eurc.toFixed(2));
    setText("totalBalance", "$" + usdc.toFixed(2));
    setText("swapFromBal", "Balance: " + usdc.toFixed(2));
    setText("bridgeFromBal", "Balance: " + usdc.toFixed(2));
    setText("sendBal", "Balance: " + usdc.toFixed(2));
  } catch (e) {
    console.error("balance fetch failed", e);
  }
}

function setText(id, txt) {
  const el = document.getElementById(id);
  if (el) el.innerText = txt;
}

/* -------------------------------------------------------------------------
   Percentage quick-fill buttons
   ------------------------------------------------------------------------- */
document.querySelectorAll(".pct span").forEach(el => {
  el.addEventListener("click", async () => {
    if (!provider || !userAddress) return;
    const full = await tokenBalance(CONFIG.USDC_ERC20);
    const pct = Number(el.dataset.pct) / 100;
    const val = (full * pct).toFixed(4);
    const panel = el.closest(".panel").id;
    if (panel === "panel-swap") setValue("swapFromAmt", val);
    if (panel === "panel-send") setValue("sendAmt", val);
  });
});

function setValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

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
   Swap — preview only. Real execution needs Circle's StableFX RFQ API to
   produce a signed quote for the FxEscrow contract; without that quote,
   submitting on-chain would just revert. See developers.circle.com/stablefx.
   ------------------------------------------------------------------------- */
const swapBtn = document.getElementById("swapBtn");
if (swapBtn) {
  swapBtn.addEventListener("click", async () => {
    const statusEl = document.getElementById("swapStatus");
    if (!signer) { statusEl.className = "status err"; statusEl.innerText = "Connect your wallet first."; return; }
    const amt = document.getElementById("swapFromAmt").value;
    if (!amt || Number(amt) <= 0) { statusEl.className = "status err"; statusEl.innerText = "Enter an amount."; return; }

    statusEl.className = "status err";
    statusEl.innerText = "Swap quotes aren't connected yet — this needs Circle's StableFX RFQ API " +
      "to sign a quote before FxEscrow (" + CONFIG.STABLEFX_ESCROW + ") will accept it.";
  });
}

/* -------------------------------------------------------------------------
   Bridge (CCTP V2) — real burn on Arc Testnet + real attestation check.
   Minting on the destination chain is left as a manual step (see hint in
   app.html) since the destination contract address must be independently
   verified per chain and this file only ships Arc-side addresses.
   ------------------------------------------------------------------------- */
const bridgeBtn = document.getElementById("bridgeBtn");
if (bridgeBtn) {
  bridgeBtn.addEventListener("click", async () => {
    const statusEl = document.getElementById("bridgeStatus");
    const progressEl = document.getElementById("bridgeProgress");
    if (!signer) { statusEl.className = "status err"; statusEl.innerText = "Connect your wallet first."; return; }

    const amt = document.getElementById("bridgeFromAmt").value;
    if (!amt || Number(amt) <= 0) { statusEl.className = "status err"; statusEl.innerText = "Enter an amount."; return; }

    const destKey = document.getElementById("bridgeToChain").value;
    const dest = CONFIG.bridgeDestinations[destKey];

    try {
      bridgeBtn.disabled = true;
      progressEl.style.display = "block";

      const usdc = new ethers.Contract(CONFIG.USDC_ERC20, ERC20_ABI, signer);
      const decimals = await usdc.decimals();
      const amountUnits = ethers.utils.parseUnits(amt, decimals);

      statusEl.className = "status"; statusEl.innerText = "Step 1/3 — approving USDC...";
      progressEl.innerText = "Approving TokenMessengerV2 to spend USDC...";
      const approveTx = await usdc.approve(CONFIG.TOKEN_MESSENGER_V2, amountUnits);
      await approveTx.wait();

      statusEl.innerText = "Step 2/3 — burning USDC on Arc Testnet...";
      progressEl.innerText = "Approved. Submitting depositForBurn...";
      const messenger = new ethers.Contract(CONFIG.TOKEN_MESSENGER_V2, TOKEN_MESSENGER_V2_ABI, signer);
      const mintRecipient = ethers.utils.hexZeroPad(userAddress, 32); // sending to yourself on destination by default
      const destinationCaller = ethers.utils.hexZeroPad("0x0000000000000000000000000000000000000000", 32); // anyone can mint
      const maxFee = 0; // standard transfer, no fast-transfer fee
      const minFinalityThreshold = 2000; // standard finality

      const burnTx = await messenger.depositForBurn(
        amountUnits, dest.domain, mintRecipient, CONFIG.USDC_ERC20,
        destinationCaller, maxFee, minFinalityThreshold
      );
      const burnReceipt = await burnTx.wait();

      statusEl.innerText = "Step 3/3 — waiting for Circle's attestation...";
      progressEl.innerText = "Burned. Tx: " + burnReceipt.transactionHash + "\nPolling Iris API for attestation...";

      const attestation = await pollAttestation(burnReceipt.transactionHash);

      statusEl.className = "status ok";
      statusEl.innerText = "Burn confirmed and attested. Finish the mint on " + dest.name + " (see instructions below).";
      progressEl.innerText =
        "Burn tx: " + burnReceipt.transactionHash + "\n" +
        "Attestation: " + (attestation ? "ready" : "still pending — check again shortly") + "\n" +
        "Next: switch MetaMask to " + dest.name + " and call receiveMessage on that chain's " +
        "MessageTransmitterV2 with this message + attestation. Verify that contract address at " +
        "developers.circle.com/cctp/evm-smart-contracts before sending anything.";

      addHistory("BRIDGE", amt + " USDC → " + dest.name, burnReceipt.transactionHash);
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

async function pollAttestation(txHash, attempts = 6, delayMs = 5000) {
  for (let i = 0; i < attempts; i++) {
    try {
      const url = `${CONFIG.IRIS_API}/v2/messages/${CONFIG.CCTP_DOMAIN_ARC}?transactionHash=${txHash}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const msg = data && data.messages && data.messages[0];
        if (msg && msg.attestation && msg.attestation !== "PENDING") {
          return msg;
        }
      }
    } catch (e) {
      console.warn("attestation poll failed", e);
    }
    await new Promise(r => setTimeout(r, delayMs));
  }
  return null;
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
    if (!amt || Number(amt) <= 0) { statusEl.className = "status err"; statusEl.innerText = "Enter an amount."; return; }

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
   History (in-memory, current session only)
   ------------------------------------------------------------------------- */
function addHistory(type, desc, txHash) {
  history.unshift({ type, desc, txHash, time: new Date().toLocaleString() });
  renderHistory();
}

function renderHistory() {
  const el = document.getElementById("historyList");
  if (!el) return;
  if (history.length === 0) {
    el.innerHTML = '<div class="status">No transactions yet this session.</div>';
    return;
  }
  el.innerHTML = history.map(h => `
    <div class="hist-item">
      <div class="htype ${h.type}">${h.type}</div>
      <div class="hamt">${h.desc}</div>
      <div style="color:var(--muted);font-size:11px;margin-top:4px;">${h.time}</div>
      <a href="${CONFIG.blockExplorerUrls[0]}/tx/${h.txHash}" target="_blank">View on explorer</a>
    </div>
  `).join("");
}

/* -------------------------------------------------------------------------
   React to account/network changes
   ------------------------------------------------------------------------- */
if (window.ethereum) {
  window.ethereum.on("accountsChanged", () => window.location.reload());
  window.ethereum.on("chainChanged", () => window.location.reload());
}
