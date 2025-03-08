defmodule Udraw.DiskAdapter do
  require Logger
  @storage_dir Application.compile_env(:udraw, :storage_dir)

  def path_to_key(canvas_name, zoom, x, y) do
    y_stripped = String.trim_trailing(y, ".png")
    "#{canvas_name}/#{zoom}/#{x}/#{y_stripped}.png"
  end

  def get_tile_at(canvas_name, zoom, x, y) do
    key = path_to_key(canvas_name, zoom, x, y)
    Logger.debug("Reading tile from disk at #{@storage_dir}/#{key}")

    case File.read(@storage_dir <> key) do
      {:ok, contents} -> {:ok, contents}
      {:error, :enoent} -> {:error, :tile_not_found}
      {:error, _reason} -> {:error, :tile_fetch_error}
    end
  end

  def save_tile_at(canvas_name, zoom, x, y, data) do
    key = path_to_key(canvas_name, zoom, x, y)
    Logger.debug("Writing tile to disk at #{@storage_dir}#{key}")
    File.mkdir_p!(Path.dirname(@storage_dir <> key))

    case File.write(@storage_dir <> key, data) do
      :ok ->
        Logger.info("Saved tile #{key}")
        {:ok, key}

      {:error, reason} ->
        {:error, reason}
    end
  end
end
