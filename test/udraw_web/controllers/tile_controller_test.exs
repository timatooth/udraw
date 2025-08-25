defmodule UdrawWeb.TileControllerTest do
  use UdrawWeb.ConnCase, async: true

  describe "GET tiles" do
    test "Getting a known tile", %{conn: conn} do
      conn = get(conn, ~p"/api/canvases/main/1/0/0.png")

      assert conn.status == 200
      assert conn.resp_body == <<137, 80, 78, 71, 13, 10, 26, 10>> <> "dummy_png_data"
    end

    test "Getting an unknown tile", %{conn: conn} do
      conn = get(conn, ~p"/api/canvases/main/1/9/-9.png")
      assert conn.status == 204
    end

    test "Test massively out of bounds tile", %{conn: conn} do
      conn = get(conn, ~p"/api/canvases/main/1/666/666.png")
      assert conn.status == 416
    end

    test "Test unlucky aws error", %{conn: conn} do
      conn = get(conn, ~p"/api/canvases/main/1/13/13.png")
      assert conn.status == 500
    end
  end
end
