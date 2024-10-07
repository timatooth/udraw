defmodule Udraw.S3Adapter do
  @moduledoc """
  Adapter for interacting with S3.
  """

  alias ExAws.S3

  @bucket_name Application.get_env(:udraw, :s3_bucket)

  def path_to_key(canvas_name, zoom, x, y) do
    "#{canvas_name}/#{zoom}/#{x}/#{y}.png"
  end

  def get_tile_at(canvas_name, zoom, x, y) do
    key = path_to_key(canvas_name, zoom, x, y)
    IO.puts("Getting object from S3 at #{key}")

    case S3.get_object(@bucket_name, key) |> ExAws.request() do
      {:ok, %{body: body}} ->
        {:ok, body}

      {:error, reason} ->
        IO.inspect(reason, label: "Error getting tile from S3")
        {:error, :not_found}
    end
  end

  def save_tile_at(canvas_name, zoom, x, y, data) do
    key = path_to_key(canvas_name, zoom, x, y)

    case S3.put_object(@bucket_name, key, data) |> ExAws.request() do
      {:ok, _} ->
        IO.puts("Saved tile #{key}")
        {:ok, true}

      {:error, reason} ->
        IO.inspect(reason, label: "Error saving tile to S3")
        {:error, false}
    end
  end
end
