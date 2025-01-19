defmodule Udraw.TileCacheServerTest do
  use ExUnit.Case

  describe("Tile cache server") do
    test "cache insert and retrieve" do
      key = "tile:main:1:0:0"
      data = <<137, 80, 78, 71, 13, 10, 26, 10>> <> "dummy_png_data"

      Udraw.TileCacheServer.put_tile(key, data)
      assert {:ok, ^data} = Udraw.TileCacheServer.get_tile(key)
    end

    test "cache insert, update and retrieve" do
      key = "tile:main:1:0:0"
      data = <<137, 80, 78, 71, 13, 10, 26, 10>> <> "dummy_png_data"
      data2 = <<137, 80, 78, 71, 13, 10, 26, 10>> <> "dummy_png_data2"
      Udraw.TileCacheServer.put_tile(key, data)
      Udraw.TileCacheServer.put_tile(key, data2)

      assert {:ok, ^data2} = Udraw.TileCacheServer.get_tile(key)
    end

    test "cache miss" do
      key = "tile:main:1:0:420"

      assert {:error, :tile_not_found} = Udraw.TileCacheServer.get_tile(key)
    end
  end

  test "concurrent access" do
    key = "tile:main:1:0:0"
    data = <<137, 80, 78, 71, 13, 10, 26, 10>> <> "dummy_png_data"

    Udraw.TileCacheServer.put_tile(key, data)

    tasks =
      for _ <- 1..10 do
        Task.async(fn -> assert {:ok, ^data} = Udraw.TileCacheServer.get_tile(key) end)
      end

    Enum.each(tasks, &Task.await/1)
  end
end
