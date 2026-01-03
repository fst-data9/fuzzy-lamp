// ----- Card / Deck helpers -----pushchange
const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const bankrollAmtEl = document.getElementById("bankrollAmt");
const betInputEl = document.getElementById("betInput");

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
function buildAndShuffleShoe(deckCount) {
    deck = [];
    for (let i = 0; i < deckCount; i++) deck.push(...createDeck());
    shuffle(deck);

    // Typical casino: stop dealing with ~1 to 1.5 decks remaining.
    const minUndealtDecks = 1.0;
    const maxUndealtDecks = 1.5;

    const undealtDecks =
        minUndealtDecks + Math.random() * (maxUndealtDecks - minUndealtDecks);

    cutCardRemaining = Math.floor(undealtDecks * 52);

    shoeNeedsShuffle = false;
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

// Betting helpers
function updateBankrollUI() {
    bankrollAmtEl.textContent = bankroll;
}

function getBetAmount() {
    const bet = Math.floor(Number(betInputEl.value));
    if (!Number.isFinite(bet) || bet <= 0) return 0;
    return bet;
}

// ----- Game state -----
let deck = [];
let playerHand = [];
let dealerHand = [];
let inRound = false;
let shoeNeedsShuffle = false;
let cutCardRemaining = 0; // when deck.length <= this, cut card is "reached"
let bankroll = 1000;
let currentBet = 0;

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
const doubleBtn = document.getElementById("doubleBtn");
const splitBtn = document.getElementById("splitBtn");

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
    const existing = containerEl.querySelectorAll("img");

    // 1) If the hand got smaller (new round), clear and rebuild once
    if (existing.length > hand.length) {
        containerEl.innerHTML = "";
    }

    // 2) Ensure we have one <img> per card; append only NEW cards
    for (let idx = containerEl.querySelectorAll("img").length; idx < hand.length; idx++) {
        const img = document.createElement("img");
        img.alt = "Card";

        // Only new cards should animate
        img.classList.add("dealt");
        img.style.animationDelay = `${idx * 60}ms`;

        containerEl.appendChild(img);
    }

    // 3) Update src for each card image (no re-creation, so no flashing)
    const imgs = containerEl.querySelectorAll("img");
    hand.forEach((card, idx) => {
        const hidden = hideSecondCard && idx === 1;
        imgs[idx].src = hidden ? "images/cards/RED_BACK.svg" : cardImageSrc(card);
        imgs[idx].alt = hidden ? "Hidden card" : `${card.rank}${card.suit}`;
    });
}
function render({ hideDealerHoleCard = false } = {}) {

    //  draw images
    renderHand(dealerCardsEl, dealerHand, { hideSecondCard: hideDealerHoleCard });
    renderHand(playerCardsEl, playerHand);

    // totals stay as text
    if (hideDealerHoleCard) {
        dealerTotalEl.textContent = dealerHand[0]
            ? `Total: ${handValue([dealerHand[0]])} (+ hidden)`
            : "Total: 0";
    } else {
        dealerTotalEl.textContent = `Total: ${handValue(dealerHand)}`;
    }

    playerTotalEl.textContent = `Total: ${handValue(playerHand)}`;

    hitBtn.disabled = !inRound;
    standBtn.disabled = !inRound;
    newGameBtn.disabled = inRound;
    surrenderBtn.disabled = !inRound || playerHand.length > 2;
    doubleBtn.disabled = !inRound || playerHand.length > 2 || bankroll < currentBet;
}

function drawCard(hand) {
    const card = deck.pop();
    hand.push(card);

    // If we've reached the cut card, reshuffle AFTER this hand finishes
    if (!shoeNeedsShuffle && deck.length <= cutCardRemaining) {
        shoeNeedsShuffle = true;
    }

    return card;
}

function endRound(message, outcome = "lose") {
    inRound = false;
    render({ hideDealerHoleCard: false });

    // Payout rules:
    // - lose: you already paid the bet, nothing returned
    // - push: return bet
    // - win: return bet + winnings (1:1)
    // - blackjack: return bet + winnings (3:2)
    // - surrender: return half the bet (rounded down)
    if (currentBet > 0) {
        if (outcome === "push") {
            bankroll += currentBet;
        } else if (outcome === "win") {
            bankroll += currentBet * 2;
        } else if (outcome === "blackjack") {
            bankroll += currentBet * 2 + Math.floor(currentBet / 2);
            // Alternative clearer: bankroll += currentBet * 2 + Math.floor(currentBet / 2);
        } else if (outcome === "surrender") {
            bankroll += Math.floor(currentBet / 2);
        }
    }

    currentBet = 0;
    updateBankrollUI();

    betInputEl.disabled = false;

    setStatus(message);
}

function checkImmediateOutcomes() {
    const p = handValue(playerHand);
    const d = handValue(dealerHand);

    // Natural blackjack checks (simple rules)
    if (playerHand.length === 2 && p === 21) {
        if (dealerHand.length === 2 && d === 21) endRound("Push: both have Blackjack.", "push");
        else endRound("You win: Blackjack!", "blackjack");
        return true;
    }
    if (dealerHand.length === 2 && d === 21) {
        endRound("Dealer wins: Blackjack.", "lose");
        return true;
    }
    return false;
}

// ----- Actions -----
function startNewGame() {
    // Get and validate bet before deailing
    const bet = getBetAmount();

    if (bet <= 0) {
        setStatus("Enter a valid bet.");
        return;
    }
    if (bet > bankroll) {
        setStatus("Not enough bankroll for that bet.");
        return;
    }

    // Take the bet "onto the table"
    currentBet = bet;
    bankroll -= currentBet;
    updateBankrollUI();

    // prevent changing bet mid-hand
    betInputEl.disabled = true;

    const deckCount = Number(deckCountSelect.value);

    // If first game, or shoe is low and we've flagged reshuffle -> rebuild shoe
    if (deck.length === 0 || shoeNeedsShuffle) {
        buildAndShuffleShoe(deckCount);
    }

    playerHand = [];
    dealerHand = [];
    inRound = true;

    drawCard(playerHand);
    drawCard(dealerHand);
    drawCard(playerHand);
    drawCard(dealerHand);

    render({ hideDealerHoleCard: true });
    setStatus(`Bet placed: $${currentBet}. Your turn: Hit or Stand.`);

    checkImmediateOutcomes();
}

function hit() {
    if (!inRound) return;

    drawCard(playerHand);
    render({ hideDealerHoleCard: true });

    const p = handValue(playerHand);
    if (p > 21) {
        endRound("You bust. Dealer wins.", "lose");
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
        endRound("Dealer busts. You win!", "win");
        return;
    }

    if (p > d) endRound(`You win! ${p} vs ${d}.`, "win");
    else if (p < d) endRound(`Dealer wins. ${d} vs ${p}.`, "lose");
    else endRound(`Push (tie). ${p} vs ${d}.`, "push");
}
function surrender() {
    if (!inRound) return;
    if (playerHand.length !== 2) {
        setStatus("Surrender is only allowed before hitting.");
        return;
    }
    endRound("You surrendered. Half bet returned.", "surrender");
}

function double() {
    if (!inRound) return;
    if (playerHand.length !== 2) {
        setStatus("Double is only allowed before hitting.");
        return;
    }

    // Double the bet
    bankroll -= currentBet;
    currentBet *= 2;
    updateBankrollUI();

    // Draw one more card and end the round
    drawCard(playerHand);
    render({ hideDealerHoleCard: true });
    stand();
}

// ----- Wire up buttons -----
newGameBtn.addEventListener("click", startNewGame);
hitBtn.addEventListener("click", hit);
standBtn.addEventListener("click", stand);
surrenderBtn.addEventListener("click", surrender);
doubleBtn.addEventListener("click", double);
splitBtn.addEventListener("click", split);

// Initial render
updateBankrollUI();
render({ hideDealerHoleCard: false });


// playing cards thanks to 
/* Vectorized Playing Cards 1.3- http://code.google.com/p/vectorized-playing-cards/
Copyright 2011 - Chris Aguilar
Licensed under LGPL 3 - www.gnu.org/copyleft/lesser.html */