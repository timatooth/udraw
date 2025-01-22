defmodule Udraw.StudioTest do
  use Udraw.DataCase

  alias Udraw.Studio

  describe "canvases" do
    alias Udraw.Studio.Canvas

    import Udraw.StudioFixtures

    @invalid_attrs %{name: nil}

    test "list_canvases/0 returns all canvases" do
      canvas = canvas_fixture()
      assert Studio.list_canvases() == [canvas]
    end

    test "get_canvas!/1 returns the canvas with given id" do
      canvas = canvas_fixture()
      assert Studio.get_canvas!(canvas.id) == canvas
    end

    test "create_canvas/1 with valid data creates a canvas" do
      valid_attrs = %{name: "some name"}

      assert {:ok, %Canvas{} = canvas} = Studio.create_canvas(valid_attrs)
      assert canvas.name == "some name"
    end

    test "create_canvas/1 with invalid data returns error changeset" do
      assert {:error, %Ecto.Changeset{}} = Studio.create_canvas(@invalid_attrs)
    end

    test "update_canvas/2 with valid data updates the canvas" do
      canvas = canvas_fixture()
      update_attrs = %{name: "some updated name"}

      assert {:ok, %Canvas{} = canvas} = Studio.update_canvas(canvas, update_attrs)
      assert canvas.name == "some updated name"
    end

    test "update_canvas/2 with invalid data returns error changeset" do
      canvas = canvas_fixture()
      assert {:error, %Ecto.Changeset{}} = Studio.update_canvas(canvas, @invalid_attrs)
      assert canvas == Studio.get_canvas!(canvas.id)
    end

    test "delete_canvas/1 deletes the canvas" do
      canvas = canvas_fixture()
      assert {:ok, %Canvas{}} = Studio.delete_canvas(canvas)
      assert_raise Ecto.NoResultsError, fn -> Studio.get_canvas!(canvas.id) end
    end

    test "change_canvas/1 returns a canvas changeset" do
      canvas = canvas_fixture()
      assert %Ecto.Changeset{} = Studio.change_canvas(canvas)
    end
  end
end
