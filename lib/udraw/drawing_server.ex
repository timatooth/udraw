defmodule Udraw.DrawingServer do
  use GenServer

  def start_link(_opts) do
    GenServer.start_link(__MODULE__, [], name: __MODULE__)
  end

  @impl true
  def init(_) do
    IO.puts("DrawingServer started up!")
    {:ok, []}
  end

  # Returns the current lines drawn in the drawing application.
  #
  # Client can use this function to retrieve the list of lines.
  def get_lines() do
    GenServer.call(__MODULE__, :get_lines)
  end

  # Clear the state of the server. Notifies any connected browsers
  def clear() do
    GenServer.cast(__MODULE__, :clear)
  end

  # Adds a new line to the drawing application.
  #
  # Client needs to provide a string representing the line to add.
  def add_line(line) do
    GenServer.cast(__MODULE__, {:add_line, line})
  end

  @impl true
  def handle_call(:get_lines, _from, lines) do
    {:reply, lines, lines}
  end

  @impl true
  def handle_cast({:add_line, line}, lines) do
    new_lines = [line | lines]
    {:noreply, new_lines}
  end

  @impl true
  def handle_cast(:clear, _lines) do
    broadcast_clear()
    {:noreply, []}
  end

  defp broadcast_clear() do
    Phoenix.PubSub.broadcast(DrawApp.PubSub, "draw:lobby", {:clear, nil})
  end
end
