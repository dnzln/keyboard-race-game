import * as config from "./config";
import game from "./game";
import login from "./login";

export default io => {
  login(io.of("/login"));
  game(io.of("/game"));
};