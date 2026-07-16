
// Elements

const connectButton = document.getElementById("connectWallet");
const heroBtn = document.getElementById("heroConnect");
const sendBtn = document.getElementById("sendBtn");

const walletInput = document.getElementById("walletAddress");
const amountInput = document.getElementById("amount");

const status = document.getElementById("status");

// ----------------------
// Wallet State
// ----------------------

let walletConnected = false;
let demoBalance = 1000;

// ----------------------
// Toast Notification
// ----------------------

function showToast(message,color="#16a34a"){

const toast=document.createElement("div");

toast.innerHTML=message;

toast.style.position="fixed";
toast.style.bottom="25px";
toast.style.right="25px";
toast.style.background=color;
toast.style.color="#fff";
toast.style.padding="14px 22px";
toast.style.borderRadius="12px";
toast.style.boxShadow="0 0 25px rgba(57,255,136,.4)";
toast.style.fontWeight="bold";
toast.style.zIndex="99999";

document.body.appendChild(toast);

setTimeout(()=>{

toast.remove();

},3000);

}

// ----------------------
// Balance
// ----------------------

const balanceCard=document.createElement("p");

balanceCard.style.marginTop="18px";
balanceCard.style.color="#39ff88";
balanceCard.style.fontWeight="700";

balanceCard.innerHTML=
"💰 Demo Balance : "+demoBalance+" USDC";

document.querySelector(".payment").appendChild(balanceCard);

function updateBalance(amount){

demoBalance-=Number(amount);

if(demoBalance<0){

demoBalance=0;

}

balanceCard.innerHTML=
"💰 Demo Balance : "+demoBalance+" USDC";

}

// ----------------------
// Connect Wallet
// ----------------------

function connectWallet(){

if(walletConnected){

showToast("Wallet Already Connected");

return;

}

walletConnected=true;

connectButton.innerHTML="🟢 Wallet Connected";

connectButton.style.background="#16a34a";

status.innerHTML="🟢 Wallet Connected";

showToast("Wallet Connected Successfully");

}

connectButton.addEventListener("click",connectWallet);

// Hero Button

if(heroBtn){

heroBtn.addEventListener("click",connectWallet);

}

// Transaction History

const history=document.createElement("div");

history.style.marginTop="30px";

history.innerHTML="<h3>📜 Recent Transactions</h3>";

document.querySelector(".payment").appendChild(history);

// Payment

sendBtn.addEventListener("click",()=>{

if(!walletConnected){

showToast("⚠ Connect Wallet First","#dc2626");

return;

}

const wallet=walletInput.value.trim();

const amount=amountInput.value.trim();

if(wallet===""||amount===""){

showToast("⚠ Fill all fields","#dc2626");

status.innerHTML="❌ Missing Information";

return;

}

status.innerHTML="⏳ Processing Payment...";

sendBtn.disabled=true;

sendBtn.innerHTML="Processing...";

setTimeout(()=>{

const txHash=
"0x"+
Math.random().toString(16).substring(2,18)+
Math.random().toString(16).substring(2,18);

updateBalance(amount);

status.innerHTML=
"✅ Payment Successful<br><small>"+txHash+"</small>";

showToast("🎉 Payment Successful");

const item=document.createElement("p");

item.style.marginTop="10px";

item.innerHTML=
"💸 "+
amount+
" USDC → "+
wallet.substring(0,8)+
"...<br><small>"+txHash+"</small>";

history.appendChild(item);

alert(
"Demo Transaction\n\n"+
"Wallet : "+wallet+
"\nAmount : "+amount+
" USDC\n\n"+
"TX Hash:\n"+txHash
);

walletInput.value="";

amountInput.value="";

walletInput.focus();

sendBtn.disabled=false;

sendBtn.innerHTML="🚀 Send Payment";

},2000);

});

// Auto Focus

walletInput.focus();

// Copy Wallet Address

walletInput.addEventListener("dblclick",()=>{

if(walletInput.value==="") return;

navigator.clipboard.writeText(walletInput.value);

showToast("📋 Wallet Address Copied");

});

// Enter Key Support

amountInput.addEventListener("keypress",(e)=>{

if(e.key==="Enter"){

sendBtn.click();

}

});

// Wallet Address Validation

walletInput.addEventListener("input",()=>{

if(walletInput.value.length>0 &&
walletInput.value.length<10){

status.innerHTML="⚠ Wallet Address seems too short";

status.style.color="#facc15";

}else{

status.style.color="#39ff88";

}

});

// Network Badge

const network=document.createElement("div");

network.innerHTML="🟢 Connected Network : Arc Testnet";

network.style.marginTop="20px";

network.style.color="#39ff88";

network.style.fontWeight="700";

document.querySelector(".payment").appendChild(network);

// Demo Version

const version=document.createElement("p");

version.innerHTML="ThorPay Demo v1.0";

version.style.marginTop="10px";

version.style.fontSize="14px";

version.style.color="#94a3b8";

document.querySelector(".payment").appendChild(version);

// Welcome

window.addEventListener("load",()=>{

setTimeout(()=>{

showToast("⚡ Welcome to ThorPay");

},800);

});

// Footer Year

const footer=document.querySelector("footer");

if(footer){

const year=document.createElement("p");

year.innerHTML="© "+new Date().getFullYear()+" ThorPay Demo";

year.style.marginTop="12px";

year.style.color="#94a3b8";

footer.appendChild(year);

}

// Console Message

console.log(
"%c⚡ ThorPay Loaded Successfully",
"color:#39ff88;font-size:18px;font-weight:bold;"
);

console.log(
"%cPowered by Arc Network",
"color:#ffffff;font-size:14px;"
);
