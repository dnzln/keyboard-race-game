import { texts } from "../data";
import * as config from "./config";

let activeUsers = {};
let place = 0;

export default io => {
  io.on("connection", socket => {
    const currentUsername = socket.handshake.query.thisUserName;
    const currentSocketId = socket.id;

    if (isNameTaken(currentUsername)) {
      socket.emit('USERNAME_IS_TAKEN');
    } else {
      addNewPlayer();
      updatePlayersLists();
    }

    socket.on('disconnect', () => {
      if (activeUsers.hasOwnProperty(currentSocketId)) {
        socket.broadcast.emit('USER_EXITED', activeUsers[currentSocketId].userId);
      }      
      delete activeUsers[currentSocketId];
      if (canStartGame()) startCountdown();
      if (canFinishGame()) showResults();
    })
    
    socket.on('ONE_IS_READY', playerSocketId => {
      activeUsers[playerSocketId].isReady = true;
      
      socket.emit('ADD_ONE_READY', activeUsers[playerSocketId].userId);
      socket.broadcast.emit('ADD_ONE_READY', activeUsers[playerSocketId].userId);

      if (canStartGame()) startCountdown();
    });

    socket.on('ONE_IS_NOT_READY', playerSocketId => {
      activeUsers[playerSocketId].isReady = false;
      
      socket.emit('ADD_ONE_NOT_READY', activeUsers[playerSocketId].userId);
      socket.broadcast.emit('ADD_ONE_NOT_READY', activeUsers[playerSocketId].userId);

      if (canStartGame()) startCountdown();
    });

    socket.on('LETER_ENTERED', ([playerSocketId, percentDone]) => {
      socket.emit('ADD_PROGRESS', [activeUsers[playerSocketId].userId, percentDone]);
      socket.broadcast.emit('ADD_PROGRESS', [activeUsers[playerSocketId].userId, percentDone]);
    });

    socket.on('ADD_FINISHER', playerSocketId => {
      activeUsers[playerSocketId].isFinished = true;
      activeUsers[playerSocketId].place = place;
      place++;
      
      socket.emit('MARK_FINISHER', activeUsers[playerSocketId].userId);
      socket.broadcast.emit('MARK_FINISHER', activeUsers[playerSocketId].userId);
      if (canFinishGame()) showResults();
    });

    
    socket.on('GAME_OVER', () => {
      place = 0;
      Object.values(activeUsers).forEach(player => player.isReady = false);
      showResults();
    });


    function canStartGame() {
      const isEnoughPlayers = Object.keys(activeUsers).length > 1;
      return isEnoughPlayers && isAllReady();
    }

    function canFinishGame() {
      return Object.values(activeUsers).every(player => player.isFinished);
    }

    function isAllReady() {
      return Object.values(activeUsers).every(player => player.isReady);
    }

    function isNameTaken(newName) {
      return Object.values(activeUsers).some(player => player.username == newName);
    }

    function addNewPlayer() {
      activeUsers[currentSocketId] = {
        username: currentUsername,
        isReady: false,
        userId: "id" + Math.random().toString(16).slice(2),
      };
    }

    function updatePlayersLists() {
      socket.emit('CONNECTION_IS_SUCCESSFUL', activeUsers);
      socket.broadcast.emit('CONNECTION_IS_SUCCESSFUL', activeUsers, currentSocketId);
    }

    function getRandomTextId() {
      return Math.floor(Math.random() * (texts.length + 1)); 
    }

    function startCountdown() {
      const gameDelay = config.SECONDS_TIMER_BEFORE_START_GAME;
      const gameTime = config.SECONDS_FOR_GAME;
      const textId = getRandomTextId();
      socket.emit('START_COUNTDOWN', [gameDelay, textId, gameTime]);
      socket.broadcast.emit('START_COUNTDOWN', [gameDelay, textId, gameTime]);
    }

    function showResults() {
      const winners = makePlayersRaiting();
      
      socket.emit('SHOW_RESLUTS', winners);
      socket.broadcast.emit('SHOW_RESLUTS', winners);
    }

    function makePlayersRaiting() {
      return Object.values(activeUsers)
        .sort((a, b) => (a.place > b.place) ? 1 : ((b.place > a.place) ? -1 : 0));
    }
  });
};