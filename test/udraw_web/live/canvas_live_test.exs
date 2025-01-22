defmodule UdrawWeb.CanvasLiveTest do
  use UdrawWeb.ConnCase

  import Phoenix.LiveViewTest
  import Udraw.StudioFixtures

  @create_attrs %{name: "some name"}
  @update_attrs %{name: "some updated name"}
  @invalid_attrs %{name: nil}

  defp create_canvas(_) do
    canvas = canvas_fixture()
    %{canvas: canvas}
  end

  describe "Index" do
    setup [:create_canvas]

    test "lists all canvases", %{conn: conn, canvas: canvas} do
      {:ok, _index_live, html} = live(conn, ~p"/canvases")

      assert html =~ "Listing Canvases"
      assert html =~ canvas.name
    end

    test "saves new canvas", %{conn: conn} do
      {:ok, index_live, _html} = live(conn, ~p"/canvases")

      assert index_live |> element("a", "New Canvas") |> render_click() =~
               "New Canvas"

      assert_patch(index_live, ~p"/canvases/new")

      assert index_live
             |> form("#canvas-form", canvas: @invalid_attrs)
             |> render_change() =~ "can&#39;t be blank"

      assert index_live
             |> form("#canvas-form", canvas: @create_attrs)
             |> render_submit()

      assert_patch(index_live, ~p"/canvases")

      html = render(index_live)
      assert html =~ "Canvas created successfully"
      assert html =~ "some name"
    end

    test "updates canvas in listing", %{conn: conn, canvas: canvas} do
      {:ok, index_live, _html} = live(conn, ~p"/canvases")

      assert index_live |> element("#canvases-#{canvas.id} a", "Edit") |> render_click() =~
               "Edit Canvas"

      assert_patch(index_live, ~p"/canvases/#{canvas}/edit")

      assert index_live
             |> form("#canvas-form", canvas: @invalid_attrs)
             |> render_change() =~ "can&#39;t be blank"

      assert index_live
             |> form("#canvas-form", canvas: @update_attrs)
             |> render_submit()

      assert_patch(index_live, ~p"/canvases")

      html = render(index_live)
      assert html =~ "Canvas updated successfully"
      assert html =~ "some updated name"
    end

    test "deletes canvas in listing", %{conn: conn, canvas: canvas} do
      {:ok, index_live, _html} = live(conn, ~p"/canvases")

      assert index_live |> element("#canvases-#{canvas.id} a", "Delete") |> render_click()
      refute has_element?(index_live, "#canvases-#{canvas.id}")
    end
  end

  describe "Show" do
    setup [:create_canvas]

    test "displays canvas", %{conn: conn, canvas: canvas} do
      {:ok, _show_live, html} = live(conn, ~p"/canvases/#{canvas}")

      assert html =~ "Show Canvas"
      assert html =~ canvas.name
    end

    test "updates canvas within modal", %{conn: conn, canvas: canvas} do
      {:ok, show_live, _html} = live(conn, ~p"/canvases/#{canvas}")

      assert show_live |> element("a", "Edit") |> render_click() =~
               "Edit Canvas"

      assert_patch(show_live, ~p"/canvases/#{canvas}/show/edit")

      assert show_live
             |> form("#canvas-form", canvas: @invalid_attrs)
             |> render_change() =~ "can&#39;t be blank"

      assert show_live
             |> form("#canvas-form", canvas: @update_attrs)
             |> render_submit()

      assert_patch(show_live, ~p"/canvases/#{canvas}")

      html = render(show_live)
      assert html =~ "Canvas updated successfully"
      assert html =~ "some updated name"
    end
  end
end
