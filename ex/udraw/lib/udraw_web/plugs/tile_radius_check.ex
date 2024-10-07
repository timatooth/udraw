defmodule UdrawWeb.Plugs.TileRadiusCheck do
  import Plug.Conn

  @tile_radius 300

  def init(opts), do: opts

  def call(conn, _opts) do
    params = conn.params
    x = String.to_integer(params["x"])
    y = String.to_integer(params["y"])

    if x < -(@tile_radius / 2) || x > @tile_radius / 2 || y < -(@tile_radius / 2) ||
         y > @tile_radius / 2 do
      conn
      |> send_resp(416, "")
      |> halt()
    else
      conn
    end
  end
end
