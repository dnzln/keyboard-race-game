import { createElement, addClass, removeClass } from "./helpers.mjs";

const thisUserName = sessionStorage.getItem("username");

if (!thisUserName) {
  window.location.replace("/login");
}

const PARTICIPANTS = document.querySelector('.participants-block');
const READY_BTN = document.querySelector('#ready-btn');
const NOT_READY_BTN = document.querySelector('#not-ready-btn');
const DISCONNECT_BTN = document.querySelector('#disconnect-btn');
const GAME_BLOCK = document.querySelector('.game-block');

READY_BTN.addEventListener('click', getReady)
NOT_READY_BTN.addEventListener('click', getNotReady)
DISCONNECT_BTN.addEventListener('click', disconnect)

function disconnect() {
  sessionStorage.removeItem("username");
  window.location.replace("/login");  
}

function getReady() {
  socket.emit('ONE_IS_READY', socket.id);
  addClass(READY_BTN, 'display-none');
  removeClass(NOT_READY_BTN, 'display-none');
}

function getNotReady() {
  socket.emit('ONE_IS_NOT_READY', socket.id);
  addClass(NOT_READY_BTN, 'display-none');
  removeClass(READY_BTN, 'display-none');
}


function nameIsTakenError() {
  alert('This username is already taken. Choose another one.')
  sessionStorage.removeItem("username");
  window.location.replace("/login");  
}

function updatePlayersList(allPlayers, id = null) {
  if (id) {
    addNewPlayer(allPlayers[id]);
  } else {
    Object.values(allPlayers).forEach(player => {
      addNewPlayer(player);
    })
  }  
}

function addNewPlayer({userId, username, isReady}) {
  const playerBlock = createElement({
    tagName: "div",
    className: "player-block",
    attributes: {
      'id': userId,
    }
  });

  const playerIndicator = createElement({
    tagName: "span",
    className: "player-indicator"
  });

  const playerName = createElement({
    tagName: "span",
    className: "player-name"
  });

  const currentPlayerPointer = createElement({
    tagName: "span",
    className: "player-pointer"
  });

  const playerProgressbar = createElement({
    tagName: "div",
    className: "player-progressbar"
  });

  const playerProgressbarContent = createElement({
    tagName: "div",
    className: "player-progressbar-content",
    attributes: {
      'id': `${userId}-progress`,
    }
  });

  if (username == thisUserName) currentPlayerPointer.innerHTML = '(you)'

  playerName.innerHTML = username;

  playerProgressbar.append(playerProgressbarContent)
  playerBlock.append(playerIndicator, playerName, currentPlayerPointer, playerProgressbar);
  PARTICIPANTS.append(playerBlock);

  if (isReady) addOneReady(userId);
}

function addOneReady(userId) {
  const indicator = document.querySelector(`#${userId} .player-indicator`);
  addClass(indicator, 'ready');
}

function addOneNotReady(userId) {
  const indicator = document.querySelector(`#${userId} .player-indicator`);
  removeClass(indicator, 'ready');
}

function userExited(userId) {
  document.querySelector(`#${userId}`).remove();
}

function startCountdown(delayTimeInSeconds, text, gameTime) {
  const delayTimeInMs = delayTimeInSeconds * 1000;
  const oneSecond = 1000;
  addClass(NOT_READY_BTN, 'display-none');
  addClass(DISCONNECT_BTN, 'display-none');
  
  const countDown = createElement({
    tagName: "span",
    className: "time-to-start"
  });

  countDown.innerHTML = delayTimeInSeconds;
  GAME_BLOCK.append(countDown);

  const timerId = setInterval(() => {
    countDown.innerHTML = +countDown.innerHTML - 1;
  }, oneSecond)

  setTimeout(() => {
    clearInterval(timerId);
    countDown.remove();
    startGame(text, gameTime)
  }, delayTimeInMs)
}

function startGame(text, gameTime) {
  const timeForGameInMs = +gameTime * 1000;
  console.log(gameTime)
  const oneSecond = 1000;

  const timer = createElement({
    tagName: "span",
    className: "game-timer"
  });

  timer.innerHTML = gameTime;

  const interval = setInterval(() => {
    timer.innerHTML = +timer.innerHTML - 1;
  }, oneSecond);

  setTimeout(() => {
    clearInterval(interval);
    socket.emit('GAME_OVER')
  }, timeForGameInMs)

  let leftText = [...text];
  let doneText = [];

  const textElementLeft = createElement({
    tagName: "p",
    className: "game-text-left"
  });

  const textElementDone = createElement({
    tagName: "p",
    className: "game-text-done"
  });


  textElementLeft.innerHTML = text;
  GAME_BLOCK.append(textElementDone, textElementLeft, timer);
  
  document.addEventListener('keydown', keyboardHandler);

  function keyboardHandler(e) {
    if (e.key == leftText[0]) {
      doneText.push(leftText.shift());
      textElementDone.innerHTML = doneText.join('');
      textElementLeft.innerHTML = leftText.join('');

      let donePercent = (100 / (text.length / doneText.length));
      socket.emit('LETER_ENTERED', [socket.id, donePercent]);
      if (!leftText.length) {
        socket.emit('ADD_FINISHER', socket.id);
      }
    }
  }
}

function addProgress([userId, donePercent]) {
  const progressBar = document.querySelector(`#${userId}-progress`);
  progressBar.setAttribute("style", `width: ${donePercent}%`);
}

function getText([gameDelay, textId, gameTime]) {
  fetchText(textId).then(text => {
    startCountdown(gameDelay, text, gameTime)
  })
}

async function fetchText(textId) {
  const data = await fetch(`/game/texts/${textId}`);
  const text = await data.text();
  return text;
}

function markFinisher(userId) {
  const progressBar = document.querySelector(`#${userId}-progress`);
  addClass(progressBar, 'finisher')
}

function showResults(winners) {
  let results = ['Results:'];
  winners.forEach((player, i, arr) => results.push(`${i + 1}) ${player.username}`));
  if (!winners.length) results.push('Noone finished in time ;(')
  alert(results.join('\n'));
  window.location.replace("/login");
}

const socket = io("http://localhost:3002/game", { query: { thisUserName } });
socket.on('USERNAME_IS_TAKEN', nameIsTakenError);
socket.on('USER_EXITED', userExited);
socket.on('CONNECTION_IS_SUCCESSFUL', updatePlayersList);
socket.on('ADD_ONE_READY', addOneReady);
socket.on('ADD_ONE_NOT_READY', addOneNotReady);
socket.on('ADD_PROGRESS', addProgress)
socket.on('START_COUNTDOWN', getText);
socket.on('MARK_FINISHER', markFinisher);
socket.on('SHOW_RESLUTS', showResults);
