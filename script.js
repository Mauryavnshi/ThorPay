// =========================
// THORPAY V2 - PART 1
// Wallet Connection
// =========================

const connectButton = document.getElementById("connectWallet");
const sendBtn = document.getElementById("sendBtn");

const status = document.getElementById("status");
const previewStatus = document.getElementById("previewStatus");

const walletInput = document.getElementById("walletAddress");
const amountInput = document.getElementById("amount");

let walletConnected = false;
let walletAddress = "";

// Disable payment until wallet connects
sendBtn.disabled = true;

connectButton.addEventListener("click", () => {

    if (!walletConnected) {

        walletConnected = true;

        walletAddress =
            "0x" +
            Math.random()
                .toString(16)
                .substring(2, 10)
                .toUpperCase();

        connectButton.innerHTML = "🟢 Wallet Connected";

        status.innerHTML = "🟢 Wallet Connected";

        previewStatus.innerHTML = "Ready to Send";

        walletInput.value = walletAddress;

        walletInput.readOnly = true;

        sendBtn.disabled = false;

    } else {

        walletConnected = false;

        walletAddress = "";

        connectButton.innerHTML = "🟠 Connect Wallet";

        status.innerHTML = "🔴 Wallet Not Connected";

        previewStatus.innerHTML =
            "Waiting for Wallet Connection";

        walletInput.value = "";

        walletInput.readOnly = false;

        amountInput.value = "";

        sendBtn.disabled = true;

    }
  // =========================
// THORPAY V2 - PART 2
// Demo Payment Logic
// =========================

const recentList = document.querySelector(".recent-card ul");

sendBtn.addEventListener("click", () => {

    if (!walletConnected) {

        showToast("Connect your wallet first!", "error");
        return;

    }

    const address = walletInput.value.trim();
    const amount = amountInput.value.trim();

    if (address === "" || amount === "") {

        showToast("Please fill all fields.", "error");
        return;

    }

    sendBtn.disabled = true;
    sendBtn.innerHTML = "⏳ Processing...";

    status.innerHTML = "🟡 Processing Payment...";
    previewStatus.innerHTML = "Transaction Pending";

    setTimeout(() => {

        const txHash =
            "0x" +
            Math.random()
                .toString(16)
                .substring(2, 14)
                .toUpperCase();

        status.innerHTML = "🟢 Payment Successful";
        previewStatus.innerHTML = "Transaction Confirmed";

        recentList.innerHTML =
            `<li>✅ ${amount} USDC → ${address.slice(0,8)}...<br><small>${txHash}</small></li>`;

        showToast("Payment Sent Successfully!", "success");

        sendBtn.innerHTML = "💸 Send Payment";
        sendBtn.disabled = false;

        amountInput.value = "";

    }, 2500);

});
// =========================
// THORPAY V2 - PART 3
// Toast + Helpers
// =========================

function showToast(message, type = "success") {

    let toast = document.getElementById("toast");

    if (!toast) {

        toast = document.createElement("div");

        toast.id = "toast";

        toast.style.position = "fixed";
        toast.style.bottom = "30px";
        toast.style.right = "30px";
        toast.style.padding = "14px 22px";
        toast.style.borderRadius = "12px";
        toast.style.fontWeight = "600";
        toast.style.zIndex = "9999";
        toast.style.transition = "0.3s ease";
        toast.style.opacity = "0";

        document.body.appendChild(toast);

    }

    toast.innerHTML = message;

    if (type === "success") {

        toast.style.background = "#16a34a";
        toast.style.color = "#ffffff";

    } else {

        toast.style.background = "#dc2626";
        toast.style.color = "#ffffff";

    }

    toast.style.opacity = "1";

    setTimeout(() => {

        toast.style.opacity = "0";

    }, 3000);

}

// =========================
// Footer Year
// =========================

const year = document.getElementById("year");

if (year) {

    year.textContent = new Date().getFullYear();

}

// =========================
// Smooth Scroll
// =========================

document.querySelectorAll('a[href^="#"]').forEach(link => {

    link.addEventListener("click", function (e) {

        e.preventDefault();

        const target = document.querySelector(this.getAttribute("href"));

        if (target) {

            target.scrollIntoView({

                behavior: "smooth"

            });

        }

    });

});

// =========================
// Page Loaded
// =========================

window.addEventListener("load", () => {

    console.log("⚡ ThorPay V2 Loaded Successfully");

});
});
