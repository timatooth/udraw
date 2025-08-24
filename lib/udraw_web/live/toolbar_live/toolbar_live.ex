defmodule UdrawWeb.ToolbarLive do
  alias UdrawWeb.Layouts
  use Phoenix.LiveView

  defp tool_icons do
    %{
      "move" => "icon ion-arrow-move",
      "brush" => "fa fa-paint-brush",
      "line" => "fa fa-stop",
      "pencil" => "fa fa-pencil",
      "spray" => "fa fa-certificate",
      "eraser" => "fa fa-eraser",
      "eyedropper" => "fa fa-eyedropper",
      "god" => "fa fa-user"
    }
  end

  def mount(_params, _session, socket) do
    {:ok,
     assign(socket,
       tool_state: %{
         tool: "brush",
         color: "#FF0000",
         size: 10,
         opacity: 100
       },
       canvas_state: %{
         offset_x: 0,
         offset_y: 0,
         cursor_x: 0,
         cursor_y: 0
       }
     )}
  end

  def render(assigns) do
    ~H"""
    <Layouts.app flash={@flash}>
      <div id="toolbar" class="toolbar">
        <form phx-change="update_tool_stuff">
          <div>
            <input
              name="color"
              type="color"
              id="color-picker"
              value={@tool_state.color}
              class="w-20 h-20 rounded-full"
              style="cursor: pointer;"
            />
          </div>
          <div>
            <label for="size">Size:</label>
            <input
              name="size"
              type="range"
              id="size-slider"
              min="1"
              max="120"
              value={@tool_state.size}
            />
          </div>
          <div>
            <label for="opacity">Opacity:</label>
            <input
              name="opacity"
              type="range"
              id="opacity-slider"
              min="1"
              max="100"
              value={@tool_state.opacity}
            />
          </div>
          <%= for {tool, icon} <- tool_icons() do %>
            <div
              class={"tool #{if @tool_state.tool == tool, do: "tool-active"}"}
              phx-click="select_tool"
              phx-value-tool={tool}
            >
              <i class={icon}></i>
            </div>
          <% end %>
        </form>
      </div>
      <canvas
        id="canvas"
        phx-hook="Canvas"
        data-tool-state={Jason.encode!(@tool_state)}
        data-canvas-state={Jason.encode!(@canvas_state)}
      >
      </canvas>
    </Layouts.app>
    """
  end

  def handle_event("select_tool", %{"tool" => tool}, socket) do
    socket = assign(socket, tool_state: Map.put(socket.assigns.tool_state, :tool, tool))

    if tool == "god" do
      {:noreply, put_flash(socket, :info, "You are god!")}
    else
      {:noreply, socket}
    end
  end

  def handle_event("update_tool_stuff", %{"_target" => ["size"]} = params, socket) do
    {:noreply,
     assign(socket,
       tool_state: Map.put(socket.assigns.tool_state, :size, String.to_integer(params["size"]))
     )}
  end

  def handle_event("update_tool_stuff", %{"_target" => ["color"]} = params, socket) do
    {:noreply,
     assign(socket, tool_state: Map.put(socket.assigns.tool_state, :color, params["color"]))}
  end

  def handle_event("update_tool_stuff", %{"_target" => ["opacity"]} = params, socket) do
    IO.puts(1 / String.to_integer(params["opacity"]))

    {:noreply,
     assign(socket,
       tool_state:
         Map.put(socket.assigns.tool_state, :opacity, String.to_integer(params["opacity"]))
     )}
  end
end
