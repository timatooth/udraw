defmodule UdrawWeb.TileController do
  use UdrawWeb, :controller
  require Logger
  alias Phoenix.PubSub

  # Allow dependency injection of the adapter
  @adapter Application.compile_env(:udraw, :s3_adapter, Udraw.S3Adapter)

  # Load error png off disk
  @red_square_png File.read!("priv/static/images/checkerboard2.png")

  def options(conn, _params) do
    conn
    |> put_resp_header("access-control-allow-methods", "PUT, GET, OPTIONS")
    |> put_resp_header("access-control-allow-headers", "content-type")
    |> send_resp(204, "")
  end

  def put_tile(conn, %{"name" => "main", "zoom" => "1"} = params) do
    current_user = conn.assigns[:current_user]

    if current_user do
      key = build_key(params)
      case Plug.Conn.read_body(conn, length: 1_000_000) do
        {:ok, body, conn} ->
          if valid_png?(body) do
            save_tile(conn, key, params, body)
          else
            handle_invalid_format(conn, key)
          end

        {:error, reason} ->
          handle_read_body_error(conn, reason)
      end
    else
      send_resp(conn, 401, "unauthorized")
    end
  end

  def put_tile(conn, _params) do
    send_resp(conn, 404, "")
  end

  defp build_key(%{"name" => name, "zoom" => zoom, "x" => x, "y" => y}) do
    "tile:#{name}:#{zoom}:#{x}:#{y}"
  end

  defp valid_png?(body) do
    png_signature = <<137, 80, 78, 71, 13, 10, 26, 10>>
    String.starts_with?(body, png_signature)
  end

  defp save_tile(conn, key, params, body) do
    case @adapter.save_tile_at(params["name"], params["zoom"], params["x"], params["y"], body) do
      {:ok, _result} ->
        Logger.debug("Saved tile #{key}")
        # We need to notify the cache server that the tile has been saved so it can purge it
        PubSub.broadcast!(Udraw.PubSub, "tile:saved", %{key: key})
        send_resp(conn, 201, "")

      {:error, reason} ->
        Logger.error("Saving #{key} to S3 FAILED reason: #{inspect(reason)}")
        send_resp(conn, 500, "")
    end
  end

  defp handle_invalid_format(conn, key) do
    Logger.error("Invalid file format for tile #{key}. Must be a PNG.")
    send_resp(conn, 415, "Invalid tile format. Must be a PNG.")
  end

  defp handle_read_body_error(conn, reason) do
    Logger.error("Failed to read body: #{inspect(reason)}")
    send_resp(conn, 500, "Failed to process request")
  end

  def get_tile(conn, %{"name" => "main", "zoom" => "1"} = params) do
    key = build_key(params)

    case Udraw.TileCacheServer.get_tile(key) do
      {:ok, data} ->
        send_resp(conn, 200, data)

      {:error, :tile_not_found} ->
        Logger.debug("Cache miss for #{key}")
        fetch_from_s3(conn, params)
    end
  end

  defp fetch_from_s3(conn, params) do
    case @adapter.get_tile_at(params["name"], params["zoom"], params["x"], params["y"]) do
      {:ok, data} ->
        Udraw.TileCacheServer.put_tile(build_key(params), data)

        conn
        |> put_resp_content_type("image/png")
        |> send_resp(200, data)

      {:error, :tile_not_found} ->
        send_resp(conn, 204, "")

      {:error, :tile_fetch_error} ->
        send_resp(conn, 500, @red_square_png)
    end
  end
end
