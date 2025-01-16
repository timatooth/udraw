// Bring in Phoenix channels client library:
import { Socket } from "phoenix";

// And connect to the path in "lib/draw_app_web/endpoint.ex". We pass the
// token for authentication. Read below how it should be used.
let socket = new Socket("/socket", { params: { token: window.userToken } });

// When you connect, you'll often need to authenticate the client.
// For example, imagine you have an authentication plug, `MyAuth`,
// which authenticates the session and assigns a `:current_user`.
// If the current user exists you can assign the user's token in
// the connection for use in the layout.
//
// In your "lib/draw_app_web/router.ex":
//
//     pipeline :browser do
//       ...
//       plug MyAuth
//       plug :put_user_token
//     end
//
//     defp put_user_token(conn, _) do
//       if current_user = conn.assigns[:current_user] do
//         token = Phoenix.Token.sign(conn, "user socket", current_user.id)
//         assign(conn, :user_token, token)
//       else
//         conn
//       end
//     end
//
// Now you need to pass this token to JavaScript. You can do so
// inside a script tag in "lib/draw_app_web/templates/layout/app.html.heex":
//
//     <script>window.userToken = "<%= assigns[:user_token] %>";</script>
//
// You will need to verify the user token in the "connect/3" function
// in "lib/draw_app_web/channels/user_socket.ex":
//
//     def connect(%{"token" => token}, socket, _connect_info) do
//       # max_age: 1209600 is equivalent to two weeks in seconds
//       case Phoenix.Token.verify(socket, "user socket", token, max_age: 1_209_600) do
//         {:ok, user_id} ->
//           {:ok, assign(socket, :user, user_id)}
//
//         {:error, reason} ->
//           :error
//       end
//     end
//
// Finally, connect to the socket:
socket.connect();

// Now that you are connected, you can join channels with a topic.
// Let's assume you have a channel with a topic named `room` and the
// subtopic is its id - in this case 42:
// let channel = socket.channel("room:42", {})
// channel.join()
//   .receive("ok", resp => { console.log("Joined successfully", resp) })
//   .receive("error", resp => { console.log("Unable to join", resp) })
//
const channel = socket.channel("draw:lobby", {});

channel
  .join()
  .receive("ok", (resp) => {
    console.log("Joined successfully, replaying state on screen");
    resp.lines.forEach((line) => drawLine({ line: line }));
  })
  .receive("error", (resp) => {
    console.log("Unable to join", resp);
  });

//draw code
const canvas = document.getElementById("paper");
const ctx = canvas.getContext("2d");

let isDrawing = false;
let lastX = 0;
let lastY = 0;

function drawLine(data) {
  ctx.beginPath();
  ctx.lineWidth = data.line.lineWidth;
  ctx.strokeStyle = data.line.strokeStyle;
  ctx.lineCap = data.line.lineCap;
  ctx.moveTo(data.line.x1, data.line.y1);
  ctx.lineTo(data.line.x2, data.line.y2);
  ctx.stroke();
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function startDrawing(e) {
  isDrawing = true;
  [lastX, lastY] = [e.offsetX, e.offsetY];
}

function stopDrawing() {
  isDrawing = false;
  ctx.beginPath();
}

function draw(e) {
  if (!isDrawing) return;

  channel.push("drawLine", {
    line: {
      x1: lastX,
      y1: lastY,
      x2: e.offsetX,
      y2: e.offsetY,
      lineWidth: 4,
      strokeStyle: "#501",
      lineCap: "round",
    },
  });

  [lastX, lastY] = [e.offsetX, e.offsetY];
}

canvas.addEventListener("mousedown", startDrawing);
canvas.addEventListener("mouseup", stopDrawing);
canvas.addEventListener("mousemove", draw);
canvas.addEventListener("mouseout", stopDrawing);

channel.on("drawLine", (payload) => {
  drawLine(payload);
});

channel.on("clear", () => {
  clearCanvas();
});

export default socket;
