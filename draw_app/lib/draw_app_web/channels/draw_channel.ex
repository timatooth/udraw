defmodule DrawAppWeb.DrawChannel do
  use DrawAppWeb, :channel

  alias DrawApp.DrawingState

  # @impl true
  # def join("draw:lobby", payload, socket) do
  #   if authorized?(payload) do
  #     {:ok, socket}
  #   else
  #     {:error, %{reason: "unauthorized"}}
  #   end
  # end
  #
  @impl true
  def join("draw:lobby", _payload, socket) do
    send(self(), :after_join)
    {:ok, %{lines: DrawingState.get_lines()}, socket}
  end

  @impl true
  def handle_in("drawLine", %{"line" => line}, socket) do
    DrawingState.add_line(line)
    broadcast!(socket, "drawLine", %{line: line})
    {:noreply, socket}
  end

  # It is also common to receive messages from the client and
  # broadcast to everyone in the current topic (draw:lobby).
  # this doesn't make a lot of sense to me
  @impl true
  def handle_info(:after_join, socket) do
    push(socket, "drawLine", %{line: %{x1: 0, y1: 0, x2: 0, y2: 0}})
    {:noreply, socket}
  end

  # Channels can be used in a request/response fashion
  # by sending replies to requests from the client
  @impl true
  def handle_in("ping", payload, socket) do
    {:reply, {:ok, payload}, socket}
  end

  # @impl true
  # def handle_in("clear", _payload, socket) do
  #   DrawingState.clear()
  #   broadcast!(socket, "clear", %{})
  #   {:noreply, socket}
  # end

  @impl true
  def handle_info({:clear, _}, socket) do
    broadcast!(socket, "clear", %{})
    {:noreply, socket}
  end

  # It is also common to receive messages from the client and
  # broadcast to everyone in the current topic (draw:lobby).
  @impl true
  def handle_in("shout", payload, socket) do
    broadcast(socket, "shout", payload)
    {:noreply, socket}
  end

  # Add authorization logic here as required.
  defp authorized?(_payload) do
    true
  end
end
