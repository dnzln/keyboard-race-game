export default io => {
  io.on("connection", socket => {
    const username = socket.handshake.query.username;
    console.log(username)
  });
};