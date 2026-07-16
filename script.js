const connectButton = document.querySelector("button");

connectButton.addEventListener("click", () => {
    alert("Wallet connection feature coming soon on ThorPay!");
});

const sendBtn = document.getElementById("sendBtn");

sendBtn.addEventListener("click", () => {
    document.getElementById("status").innerText =
        "Status: Demo Payment Successful ✅";

    alert("Demo payment sent successfully!");
});
