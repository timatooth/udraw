defmodule UdrawWeb.TileController do
  use UdrawWeb, :controller
  require Logger

  def options(conn, _params) do
    conn
    |> put_resp_header("access-control-allow-methods", "PUT, GET, OPTIONS")
    |> put_resp_header("access-control-allow-headers", "content-type")
    |> send_resp(204, "")
  end

  def put_tile(conn, %{"name" => "main", "zoom" => "1"} = params) do
    key = "tile:#{params["name"]}:#{params["zoom"]}:#{params["x"]}:#{params["y"]}"

    {:ok, body, _conn} = Plug.Conn.read_body(conn, length: 7_000_000)

    case Udraw.S3Adapter.save_tile_at(
           params["name"],
           params["zoom"],
           params["x"],
           params["y"],
           body
         ) do
      {:ok, _result} ->
        Logger.info("Saved tile #{key}")
        send_resp(conn, 201, "")

      {:error, _reason} ->
        Logger.error("Saving #{key} to S3 FAILED")
        send_resp(conn, 500, "")
    end
  end

  def put_tile(conn, _params) do
    send_resp(conn, 404, "")
  end

  def get_tile(conn, %{"name" => "main", "zoom" => "1"} = params) do
    case Udraw.S3Adapter.get_tile_at(params["name"], params["zoom"], params["x"], params["y"]) do
      {:ok, data} ->
        conn
        |> put_resp_content_type("image/png")
        |> send_resp(200, data)

      {:error, :not_found} ->
        send_resp(conn, 204, "")

      {:error, _reason} ->
        send_resp(conn, 500, "")
    end
  end

  def get_tile(conn, _params) do
    send_resp(conn, 404, "")
  end
end
