/* ==========================================
   THORPAY V2
========================================== */

const pages = document.querySelectorAll(".page");
const navButtons = document.querySelectorAll(".nav-btn");

/* ==========================================
PAGE SWITCH
========================================== */

navButtons.forEach(button => {

    button.addEventListener("click", () => {

        navButtons.forEach(btn => {

            btn.classList.remove("active");

        });

        button.classList.add("active");

        const page = button.dataset.page;

        pages.forEach(section => {

            section.classList.remove("active-page");

        });

        document
            .getElementById(page + "-page")
            .classList.add("active-page");

    });

});


/* ==========================================
AMOUNT
========================================== */

const amountInput = document.getElementById("amount");

const plusButton = document.getElementById("plusAmount");

const minusButton = document.getElementById("minusAmount");


if(amountInput){

    plusButton.addEventListener("click",()=>{

        let value=parseFloat(amountInput.value)||0.1;

        value++;

        amountInput.value=value.toFixed(1);

    });


    minusButton.addEventListener("click",()=>{

        let value=parseFloat(amountInput.value)||0.1;

        value--;

        if(value<0.1){

            value=0.1;

        }

        amountInput.value=value.toFixed(1);

    });


    amountInput.addEventListener("change",()=>{

        let value=parseFloat(amountInput.value);

        if(isNaN(value)||value<0.1){

            amountInput.value=0.1;

        }

    });

}


/* ==========================================
MOUSE WHEEL DISABLE
========================================== */

document.querySelectorAll("input[type=number]")

.forEach(input=>{

    input.addEventListener("wheel",e=>{

        e.preventDefault();

    });
/* ==========================================
   WALLET MODAL
========================================== */

const walletModal = document.getElementById("walletModal");

const connectWalletBtn = document.getElementById("connectWallet");

const closeWalletBtn = document.getElementById("closeWallet");


if(connectWalletBtn && walletModal){

    connectWalletBtn.addEventListener("click",()=>{

        walletModal.classList.add("active");

    });

}


if(closeWalletBtn){

    closeWalletBtn.addEventListener("click",()=>{

        walletModal.classList.remove("active");

    });

}


if(walletModal){

    walletModal.addEventListener("click",(event)=>{

        if(event.target===walletModal){

            walletModal.classList.remove("active");

        }

    });

}


/* ==========================================
TOAST
========================================== */

function showToast(id,message){

    const toast=document.getElementById(id);

    if(!toast) return;

    const text=toast.querySelector("span");

    if(text){

        text.textContent=message;

    }

    toast.classList.add("show");

    setTimeout(()=>{

        toast.classList.remove("show");

    },3000);

}


/* ==========================================
LOADING
========================================== */

const loadingOverlay=document.getElementById("loadingOverlay");


function showLoading(){

    if(loadingOverlay){

        loadingOverlay.classList.add("active");

    }

}


function hideLoading(){

    if(loadingOverlay){

        loadingOverlay.classList.remove("active");

    }

}


/* ==========================================
CONFIRM MODAL
========================================== */

const confirmModal=document.getElementById("confirmModal");

const sendButton=document.querySelector(".primary-btn");

const confirmButton=document.getElementById("confirmTransaction");

const cancelButton=document.getElementById("cancelTransaction");


if(sendButton){

    sendButton.addEventListener("click",()=>{

        if(confirmModal){

            confirmModal.classList.add("active");

        }

    });

}


if(cancelButton){

    cancelButton.addEventListener("click",()=>{

        confirmModal.classList.remove("active");

    });

}


if(confirmButton){

    confirmButton.addEventListener("click",()=>{

        confirmModal.classList.remove("active");

        showLoading();

        setTimeout(()=>{

            hideLoading();

            showToast(

                "successToast",

                "Transaction Successful"

            );

        },2000);

    });

}


/* ==========================================
MAX BUTTON
========================================== */

const maxButton=document.querySelector(".max-btn");

if(maxButton && amountInput){

    maxButton.addEventListener("click",()=>{

        amountInput.value="100.0";

    });

}
  /* ==========================================
   WALLET MODAL
========================================== */

const walletModal = document.getElementById("walletModal");

const connectWalletBtn = document.getElementById("connectWallet");

const closeWalletBtn = document.getElementById("closeWallet");


if(connectWalletBtn && walletModal){

    connectWalletBtn.addEventListener("click",()=>{

        walletModal.classList.add("active");

    });

}


if(closeWalletBtn){

    closeWalletBtn.addEventListener("click",()=>{

        walletModal.classList.remove("active");

    });

}


if(walletModal){

    walletModal.addEventListener("click",(event)=>{

        if(event.target===walletModal){

            walletModal.classList.remove("active");

        }

    });

}


/* ==========================================
TOAST
========================================== */

function showToast(id,message){

    const toast=document.getElementById(id);

    if(!toast) return;

    const text=toast.querySelector("span");

    if(text){

        text.textContent=message;

    }

    toast.classList.add("show");

    setTimeout(()=>{

        toast.classList.remove("show");

    },3000);

}


/* ==========================================
LOADING
========================================== */

const loadingOverlay=document.getElementById("loadingOverlay");


function showLoading(){

    if(loadingOverlay){

        loadingOverlay.classList.add("active");

    }

}


function hideLoading(){

    if(loadingOverlay){

        loadingOverlay.classList.remove("active");

    }

}


/* ==========================================
CONFIRM MODAL
========================================== */

const confirmModal=document.getElementById("confirmModal");

const sendButton=document.querySelector(".primary-btn");

const confirmButton=document.getElementById("confirmTransaction");

const cancelButton=document.getElementById("cancelTransaction");


if(sendButton){

    sendButton.addEventListener("click",()=>{

        if(confirmModal){

            confirmModal.classList.add("active");

        }

    });

}


if(cancelButton){

    cancelButton.addEventListener("click",()=>{

        confirmModal.classList.remove("active");

    });

}


if(confirmButton){

    confirmButton.addEventListener("click",()=>{

        confirmModal.classList.remove("active");

        showLoading();

        setTimeout(()=>{

            hideLoading();

            showToast(

                "successToast",

                "Transaction Successful"

            );

        },2000);

    });

}


/* ==========================================
MAX BUTTON
========================================== */

const maxButton=document.querySelector(".max-btn");

if(maxButton && amountInput){

    maxButton.addEventListener("click",()=>{

        amountInput.value="100.0";

    });

}
  /* ==========================================
   SWAP BUTTON (DEMO)
========================================== */

const swapButton = document.getElementById("swapButton");

if (swapButton) {

    swapButton.addEventListener("click", () => {

        showLoading();

        setTimeout(() => {

            hideLoading();

            showToast(

                "successToast",

                "Swap Completed Successfully"

            );

        }, 2000);

    });

}


/* ==========================================
NETWORK STATUS (DEMO)
========================================== */

const networkBadge = document.querySelectorAll(".network-badge");

networkBadge.forEach((badge) => {

    badge.title = "Connected to Arc Testnet";

});


/* ==========================================
COPY RECIPIENT
========================================== */

if (recipientInput) {

    recipientInput.addEventListener("dblclick", () => {

        navigator.clipboard.writeText(recipientInput.value);

        showToast(

            "infoToast",

            "Address Copied"

        );

    });

}


/* ==========================================
INPUT FORMAT
========================================== */

document.querySelectorAll("input[type='number']").forEach((input) => {

    input.addEventListener("blur", () => {

        let value = parseFloat(input.value);

        if (isNaN(value) || value < 0.1) {

            value = 0.1;

        }

        input.value = value.toFixed(1);

    });

});


/* ==========================================
UTILITY
========================================== */

function enableButton(button) {

    if (!button) return;

    button.disabled = false;

    button.style.opacity = "1";

}

function disableButton(button) {

    if (!button) return;

    button.disabled = true;

    button.style.opacity = ".6";

}


/* ==========================================
INITIALIZE
========================================== */

window.addEventListener("load", () => {

    console.log("ThorPay V2 Loaded");

    showToast(

        "infoToast",

        "Welcome to ThorPay"

    );

});


/* ==========================================
PLACEHOLDER FOR FUTURE
========================================== */

// TODO:
// Circle Wallet SDK
// WalletConnect
// MetaMask Provider
// Rabby Detection
// Coinbase Wallet
// Arc RPC
// Real Token Balance
// Real Send Transaction
// Real Swap
// Real Bridge
// Transaction History
// QR Code Payments
// Theme Toggle
// Settings Page
// Multi-language Support
});
