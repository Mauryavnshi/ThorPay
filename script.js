/*==================================================
  THORPAY
  SCRIPT.JS
  PART 1
==================================================*/

/*==================================================
  ELEMENTS
==================================================*/

const navLinks = document.querySelectorAll(".nav-links a");

const sections = document.querySelectorAll(".page-section");

const walletModal = document.getElementById("walletModal");

const connectWalletBtn = document.getElementById("connectWalletBtn");

const closeWalletModal = document.getElementById("closeWalletModal");

const faucetBtn = document.getElementById("faucetBtn");

const maxBtn = document.getElementById("maxBtn");

const amountInput = document.getElementById("amountInput");

const tokenSelect = document.getElementById("tokenSelect");

const sendForm = document.getElementById("sendForm");

const swapForm = document.getElementById("swapForm");

const transactionList = document.getElementById("transactionList");

const walletBalance = document.getElementById("walletBalance");

const usdValue = document.getElementById("usdValue");

const networkFee = document.getElementById("networkFee");

const walletOptions = document.querySelectorAll(".wallet-option");

/*==================================================
  APP STATE
==================================================*/

const state = {

    walletConnected:false,

    walletAddress:"",

    network:"",

    balances:{

        USDC:0,

        EURC:0,

        cirBTC:0

    },

    transactions:[]

};

/*==================================================
  INIT
==================================================*/

document.addEventListener("DOMContentLoaded",()=>{

    initNavigation();

    initWalletModal();

    initSendForm();

    initSwapForm();

    initButtons();

    renderWallet();

    renderTransactions();

});

/*==================================================
  NAVIGATION
==================================================*/

function initNavigation(){

    navLinks.forEach(link=>{

        link.addEventListener("click",(e)=>{

            e.preventDefault();

            const target = link.dataset.section;

            showSection(target);

        });

    });

}

function showSection(id){

    sections.forEach(section=>{

        section.style.display="none";

    });

    navLinks.forEach(link=>{

        link.classList.remove("active");

    });

    const activeSection=document.getElementById(id);

    if(activeSection){

        activeSection.style.display="block";

    }

    document

        .querySelector(`[data-section="${id}"]`)

        ?.classList

        .add("active");

}

/*==================================================
  WALLET MODAL
==================================================*/

function initWalletModal(){

    connectWalletBtn?.addEventListener(

        "click",

        ()=>{

            walletModal.classList.add("active");

        }

    );

    closeWalletModal?.addEventListener(

        "click",

        ()=>{

            walletModal.classList.remove("active");

        }

    );

    walletModal?.addEventListener(

        "click",

        (e)=>{

            if(e.target===walletModal){

                walletModal.classList.remove("active");

            }

        }

    );

}

/*==================================================
  BUTTONS
==================================================*/

function initButtons(){

    maxBtn?.addEventListener(

        "click",

        ()=>{

            const token=tokenSelect.value;

            amountInput.value=state.balances[token];

            updateUsdValue();

        }

    );

    faucetBtn?.addEventListener(

        "click",

        ()=>{

            alert(

                "Circle Testnet Faucet will open here."

            );

        }

    );

}

/*==================================================
  PLACEHOLDER
==================================================*/

walletOptions.forEach(wallet=>{

    wallet.addEventListener(

        "click",

        ()=>{

            alert(

                "Wallet integration will be added in next stage."

            );

        }

    );

});

/*==================================================
  SEND FORM
==================================================*/

function initSendForm(){

    if(!sendForm) return;

    amountInput?.addEventListener(

        "input",

        updateUsdValue

    );

    tokenSelect?.addEventListener(

        "change",

        ()=>{

            updateUsdValue();

            updateWalletBalance();

        }

    );

    sendForm.addEventListener(

        "submit",

        handleSend

    );

}

function handleSend(e){

    e.preventDefault();

    if(!state.walletConnected){

        notify(

            "Please connect your wallet first.",
            "error"
        );

        return;

    }

    const recipient=document

        .getElementById("recipientAddress")

        .value

        .trim();

    const amount=parseFloat(

        amountInput.value

    );

    const token=tokenSelect.value;

    if(recipient===""){

        notify(

            "Recipient address is required.",
            "error"
        );

        return;

    }

    if(isNaN(amount)||amount<=0){

        notify(

            "Enter a valid amount.",
            "error"
        );

        return;

    }

    if(amount>state.balances[token]){

        notify(

            "Insufficient balance.",
            "error"
        );

        return;

    }

    addTransaction({

        type:"Send",

        token,

        amount,

        address:recipient,

        status:"Pending",

        time:new Date().toLocaleTimeString()

    });

    notify(

        "Transaction prepared. Web3 execution will be added later.",

        "success"

    );

    sendForm.reset();

    updateUsdValue();

    updateWalletBalance();

}

/*==================================================
  SWAP FORM
==================================================*/

function initSwapForm(){

    if(!swapForm) return;

    swapForm.addEventListener(

        "submit",

        handleSwap

    );

    const swapAmount=

        document.getElementById(

            "swapAmount"

        );

    swapAmount?.addEventListener(

        "input",

        updateReceiveEstimate

    );

    document

        .getElementById(

            "swapDirectionBtn"

        )

        ?.addEventListener(

            "click",

            reverseSwap

        );

}

function handleSwap(e){

    e.preventDefault();

    if(!state.walletConnected){

        notify(

            "Connect wallet first.",

            "error"

        );

        return;

    }

    notify(

        "Swap integration will be enabled after Circle SDK integration.",

        "success"

    );

}

function reverseSwap(){

    const from=

        document.getElementById(

            "fromToken"

        );

    const to=

        document.getElementById(

            "toToken"

        );

    const value=from.value;

    from.value=to.value;

    to.value=value;

    updateReceiveEstimate();

}

function updateReceiveEstimate(){

    const amount=parseFloat(

        document

        .getElementById(

            "swapAmount"

        ).value||0

    );

    document

        .getElementById(

            "receiveAmount"

        ).value=amount.toFixed(2);

}

/*==================================================
  WALLET DATA
==================================================*/

function updateWalletBalance(){

    const token=tokenSelect.value;

    walletBalance.textContent=

        `${state.balances[token]} ${token}`;

}

function updateUsdValue(){

    const value=parseFloat(

        amountInput.value||0

    );

    usdValue.textContent=

        `$${value.toFixed(2)}`;

    networkFee.textContent=

        value===0

        ? "--"

        : "~ $0.01";

}
/*==================================================
  TRANSACTIONS
==================================================*/

function addTransaction(transaction){

    state.transactions.unshift(transaction);

    renderTransactions();

}

function renderTransactions(){

    if(!transactionList) return;

    if(state.transactions.length===0){

        transactionList.innerHTML=`

            <div class="empty-state">

                <i class="fa-solid fa-clock-rotate-left"></i>

                <h3>No Transactions Yet</h3>

                <p>

                    Your latest transfers will appear here after connecting your wallet.

                </p>

            </div>

        `;

        return;

    }

    transactionList.innerHTML="";

    state.transactions.forEach(tx=>{

        const item=document.createElement("div");

        item.className="transaction-item";

        item.innerHTML=`

            <div>

                <strong>${tx.type}</strong>

                <p>${tx.amount} ${tx.token}</p>

                <small>${tx.address}</small>

            </div>

            <div style="text-align:right">

                <strong>${tx.status}</strong>

                <br>

                <small>${tx.time}</small>

            </div>

        `;

        transactionList.appendChild(item);

    });

}

/*==================================================
  WALLET RENDER
==================================================*/

function renderWallet(){

    if(!connectWalletBtn) return;

    if(state.walletConnected){

        const shortAddress=

            state.walletAddress.slice(0,6)+

            "..."

            +

            state.walletAddress.slice(-4);

        connectWalletBtn.textContent=

            shortAddress;

    }else{

        connectWalletBtn.textContent=

            "Connect Wallet";

    }

    updateWalletBalance();

}

/*==================================================
  NOTIFICATION
==================================================*/

function notify(message,type="success"){

    const toast=document.createElement("div");

    toast.className=`toast ${type}`;

    toast.textContent=message;

    Object.assign(toast.style,{

        position:"fixed",

        right:"20px",

        bottom:"20px",

        padding:"14px 18px",

        borderRadius:"12px",

        background:

            type==="success"

            ?"#22c55e"

            :"#ef4444",

        color:"#fff",

        fontWeight:"600",

        zIndex:"99999",

        boxShadow:

            "0 12px 30px rgba(0,0,0,.25)",

        opacity:"0",

        transform:"translateY(20px)",

        transition:"all .25s ease"

    });

    document.body.appendChild(toast);

    requestAnimationFrame(()=>{

        toast.style.opacity="1";

        toast.style.transform="translateY(0)";

    });

    setTimeout(()=>{

        toast.style.opacity="0";

        toast.style.transform="translateY(20px)";

        setTimeout(()=>{

            toast.remove();

        },250);

    },2500);

}

/*==================================================
  HELPERS
==================================================*/

function resetForms(){

    sendForm?.reset();

    swapForm?.reset();

    updateUsdValue();

    updateWalletBalance();

}

function formatNumber(value){

    return Number(value).toLocaleString(

        undefined,

        {

            minimumFractionDigits:2,

            maximumFractionDigits:2

        }

    );

}

function isWalletConnected(){

    return state.walletConnected;

}
/*==================================================
  APP STARTUP
==================================================*/

function initializeApp(){

    showSection("sendSection");

    updateWalletBalance();

    updateUsdValue();

    renderWallet();

    renderTransactions();

}

initializeApp();

/*==================================================
  KEY
