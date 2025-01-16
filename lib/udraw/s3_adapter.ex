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

      {:error, :not_found} ->
        Logger.notice("No tile at #{key} in S3")
        {:error, :not_found}

      {:error, reason} ->
        Logger.notice("Error getting tile: #{key} from S3: #{inspect(reason)}")
        {:error, reason}
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
