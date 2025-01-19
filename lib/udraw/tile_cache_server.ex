defmodule Udraw.TileCacheServer do
  use GenServer
  require Logger

  # API

  def start_link(_opts) do
    GenServer.start_link(__MODULE__, :ok, name: __MODULE__)
  end

  def get_tile(key) do
    GenServer.call(__MODULE__, {:get_tile, key})
  end

  def put_tile(key, data) do
    GenServer.call(__MODULE__, {:put_tile, key, data})
  end

  # Server Functions
  @impl true
  def init(_) do
    :ets.new(:tile_cache, [:set, :protected, :named_table])
    {:ok, :ok}
  end

  @impl true
  def handle_call({:get_tile, key}, _from, state) do
    case :ets.lookup(:tile_cache, key) do
      [{^key, cached_tile_data}] ->
        Logger.debug("Cache hit for #{key}")
        {:reply, {:ok, cached_tile_data}, state}

      [] ->
        {:reply, {:error, :tile_not_found}, state}
    end
  end

  @impl true
  def handle_call({:put_tile, key, data}, _from, state) do
    :ets.insert(:tile_cache, {key, data})
    Logger.debug("Cache insert for #{key}")
    {:reply, :ok, state}
  end
end
