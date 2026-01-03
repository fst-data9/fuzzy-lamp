// ----- Card / Deck helpers -----pushchange
const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function createDeck() {
    const deck = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push({ rank, suit });
        }
    }
    return deck;
}

function shuffle(deck) {
    // Fisher–Yates
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
}

function cardToString(card) {
    return `${card.rank}${card.suit}`;
}

function handValue(hand) {
    // Count Aces as 11 initially, then reduce to 1 as needed
    let total = 0;
    let aces = 0;

    for (const c of hand) {
        if (c.rank === "A") {
            total += 11;
            aces += 1;
        } else if (["K", "Q", "J"].includes(c.rank)) {
            total += 10;
        } else {
            total += Number(c.rank);
        }
    }

    while (total > 21 && aces > 0) {
        total -= 10; // convert one Ace from 11 to 1
        aces -= 1;
    }
    return total;
}

// ----- Game state -----
let deck = [];
let playerHand = [];
let dealerHand = [];
let inRound = false;

// ----- UI elements -----
const dealerCardsEl = document.getElementById("dealerCards");
const dealerTotalEl = document.getElementById("dealerTotal");
const playerCardsEl = document.getElementById("playerCards");
const playerTotalEl = document.getElementById("playerTotal");
const statusEl = document.getElementById("status");

const newGameBtn = document.getElementById("newGameBtn");
const hitBtn = document.getElementById("hitBtn");
const standBtn = document.getElementById("standBtn");
const surrenderBtn = document.getElementById("surrenderBtn");
const deckCountSelect = document.getElementById("deckCountSelect");

function suitCode(suit) {
    // match your suit symbols to filename letters
    if (suit === "♠") return "S";
    if (suit === "♥") return "H";
    if (suit === "♦") return "D";
    if (suit === "♣") return "C";
    return "";
}
function cardImageSrc(card) {
    return `images/cards/${card.rank}${suitCode(card.suit)}.svg`;
}
function setStatus(msg) {
    statusEl.textContent = msg;
}
function renderHand(containerEl, hand, { hideSecondCard = false } = {}) {
    containerEl.innerHTML = ""; // clear existing

    hand.forEach((card, idx) => {
        const img = document.createElement("img");

        const shouldHide = hideSecondCard && idx === 1;
        img.src = shouldHide ? "images/cards/RED_BACK.svg" : cardImageSrc(card);
        img.alt = shouldHide ? "Hidden card" : cardToString(card);

        containerEl.appendChild(img);
    });
}
function render({ hideDealerHoleCard = false } = {}) {

    renderHand(dealerCardsEl, dealerHand, { hideSecondCard: hideDealerHoleCard });
    renderHand(playerCardsEl, playerHand);
    // Dealer
    if (hideDealerHoleCard) {
        const shown = dealerHand[0] ? [dealerHand[0]] : [];
        dealerCardsEl.textContent = shown.map(cardToString).join(" ") + (dealerHand.length > 1 ? "  ??" : "");
        dealerTotalEl.textContent = dealerHand[0]
            ? `Total: ${handValue([dealerHand[0]])} (+ hidden)`
            : "Total: 0";
    } else {
        dealerCardsEl.textContent = dealerHand.map(cardToString).join(" ");
        dealerTotalEl.textContent = `Total: ${handValue(dealerHand)}`;
    }

    // Player
    playerCardsEl.textContent = playerHand.map(cardToString).join(" ");
    playerTotalEl.textContent = `Total: ${handValue(playerHand)}`;

    hitBtn.disabled = !inRound;
    standBtn.disabled = !inRound;
    newGameBtn.disabled = inRound;
    surrenderBtn.disabled = !inRound;
}

function drawCard(hand) {
    const card = deck.pop();
    hand.push(card);
    return card;
}

function endRound(message) {
    inRound = false;
    render({ hideDealerHoleCard: false });
    setStatus(message);
}

function checkImmediateOutcomes() {
    const p = handValue(playerHand);
    const d = handValue(dealerHand);

    // Natural blackjack checks (simple rules)
    if (playerHand.length === 2 && p === 21) {
        if (dealerHand.length === 2 && d === 21) {
            endRound("Push: both have Blackjack.");
        } else {
            endRound("You win: Blackjack!");
        }
        return true;
    }
    if (dealerHand.length === 2 && d === 21) {
        endRound("Dealer wins: Blackjack.");
        return true;
    }
    return false;
}

// ----- Actions -----
function startNewGame() {
    const deckCount = Number(deckCountSelect.value);
    deck = [];
    for (let i = 0; i < deckCount; i++) {
        deck.push(...createDeck());
    }
    shuffle(deck);

    playerHand = [];
    dealerHand = [];
    inRound = true;
    // console.log("Shuffled deck:", deck);
    // Initial deal: player, dealer, player, dealer
    drawCard(playerHand);
    drawCard(dealerHand);
    drawCard(playerHand);
    drawCard(dealerHand);

    render({ hideDealerHoleCard: true });
    setStatus("Your turn: Hit, Stand or Surrender.");

    checkImmediateOutcomes();
}

function hit() {
    if (!inRound) return;

    drawCard(playerHand);
    render({ hideDealerHoleCard: true });

    const p = handValue(playerHand);
    if (p > 21) {
        endRound("You bust. Dealer wins.");
    } else if (p === 21) {
        // Auto-stand when 21
        stand();
    } else {
        setStatus("Hit or Stand?");
    }
}

function dealerPlay() {
    // Dealer draws until 17 or more (stands on soft 17 in this simple version)
    while (handValue(dealerHand) < 17) {
        drawCard(dealerHand);
    }
}

function stand() {
    if (!inRound) return;

    // Dealer reveals and plays
    dealerPlay();

    const p = handValue(playerHand);
    const d = handValue(dealerHand);

    if (d > 21) {
        endRound("Dealer busts. You win!");
        return;
    }

    if (p > d) endRound(`You win! ${p} vs ${d}.`);
    else if (p < d) endRound(`Dealer wins. ${d} vs ${p}.`);
    else endRound(`Push (tie). ${p} vs ${d}.`);
}
function surrender() {
    if (!inRound) return;

    endRound("You surrendered. Dealer wins.");
}

// ----- Wire up buttons -----
newGameBtn.addEventListener("click", startNewGame);
hitBtn.addEventListener("click", hit);
standBtn.addEventListener("click", stand);
surrenderBtn.addEventListener("click", surrender);

// Initial render
render({ hideDealerHoleCard: false });


// playing cards thanks to 
/* Vectorized Playing Cards 1.3- http://code.google.com/p/vectorized-playing-cards/
Copyright 2011 - Chris Aguilar
Licensed under LGPL 3 - www.gnu.org/copyleft/lesser.html */