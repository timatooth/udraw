defmodule Udraw.S3Adapter do
  @moduledoc """
  Adapter for interacting with S3.
  """
  require Logger

  alias ExAws.S3

  @bucket_name Application.compile_env(:udraw, :s3_bucket)

  def path_to_key(canvas_name, zoom, x, y) do
    y_stripped = String.trim_trailing(y, ".png")
    "#{canvas_name}/#{zoom}/#{x}/#{y_stripped}.png"
  end

  def get_tile_at(canvas_name, zoom, x, y) do
    key = path_to_key(canvas_name, zoom, x, y)
    Logger.debug("Getting object from S3 at #{key}")

    case S3.get_object(@bucket_name, key) |> ExAws.request() do
      {:ok, %{body: body}} ->
        {:ok, body}

      {:error, {:http_error, 404, _xml_reason_body}} ->
        Logger.notice("No tile at #{key} in S3")
        {:error, :tile_not_found}

      {:error, reason} ->
        Logger.notice("Error getting tile: #{key} from S3: #{inspect(reason)}")
        {:error, :tile_fetch_error}
    end
  end

  def save_tile_at(canvas_name, zoom, x, y, data) do
    key = path_to_key(canvas_name, zoom, x, y)

    case S3.put_object(@bucket_name, key, data) |> ExAws.request() do
      {:ok, _} ->
        Logger.info("Saved tile #{key}")
        {:ok, key}

      {:error, reason} ->
        Logger.error("Error saving tile to S3 reason: #{inspect(reason)}")
        {:error, reason}
    end
  end
end


defmodule Udraw.MockS3Adapter do
  def save_tile_at("main", "1", "1", y, _data) do
    case y do
      "1.png" ->
        {:ok, "dummy_key"}
      "9.png" ->
        {:error, :tile_not_found}
      "13.png" ->
        {:error, :tile_save_error}
    end

  end

  def get_tile_at("main", "1", "0", "0.png") do
    {:ok, <<137, 80, 78, 71, 13, 10, 26, 10>> <> "dummy_png_data"}
  end

  def get_tile_at("main", "1", "9", "-9.png") do
      {:error, :tile_not_found}
  end

  # unlucky number for testing aws s3 errors
  def get_tile_at("main", "1", "13", "13.png") do
    {:error, :tile_fetch_error}
  end
end
