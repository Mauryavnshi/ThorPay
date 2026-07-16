
// Connect Wallet
const connectButton = document.getElementById("connectWallet");

connectButton.addEventListener("click", () => {

    connectButton.innerText = "🟢 Wallet Connected";
    connectButton.style.background = "#16a34a";

    alert("Demo Wallet Connected Successfully!");

});

// Send Payment
const sendBtn = document.getElementById("sendBtn");

sendBtn.addEventListener("click", () => {

    const wallet = document.getElementById("walletAddress").value;
    const amount = document.getElementById("amount").value;
    const status = document.getElementById("status");

    if(wallet === "" || amount === ""){

        alert("Please enter Wallet Address and Amount.");

        return;

    }

    status.innerHTML = "⏳ Processing Payment...";

    sendBtn.disabled = true;
    sendBtn.innerHTML = "Processing...";

    setTimeout(() => {

        status.innerHTML =
        "✅ Demo Payment Successful";

        alert(
            "Demo Payment Sent!\n\n" +
            "Recipient: " + wallet +
            "\nAmount: " + amount + " USDC"
        );

        sendBtn.disabled = false;
        sendBtn.innerHTML = "🚀 Send Payment";

    },2000);

});
