defmodule UdrawWeb.CanvasLive.Index do
  use UdrawWeb, :live_view

  alias Udraw.Studio
  alias Udraw.Studio.Canvas

  @impl true
  def mount(_params, _session, socket) do
    {:ok, stream(socket, :canvases, Studio.list_canvases())}
  end

  @impl true
  def handle_params(params, _url, socket) do
    {:noreply, apply_action(socket, socket.assigns.live_action, params)}
  end

  defp apply_action(socket, :edit, %{"id" => id}) do
    socket
    |> assign(:page_title, "Edit Canvas")
    |> assign(:canvas, Studio.get_canvas!(id))
  end

  defp apply_action(socket, :new, _params) do
    socket
    |> assign(:page_title, "New Canvas")
    |> assign(:canvas, %Canvas{})
  end

  defp apply_action(socket, :index, _params) do
    socket
    |> assign(:page_title, "Listing Canvases")
    |> assign(:canvas, nil)
  end

  @impl true
  def handle_info({UdrawWeb.CanvasLive.FormComponent, {:saved, canvas}}, socket) do
    {:noreply, stream_insert(socket, :canvases, canvas)}
  end

  @impl true
  def handle_event("delete", %{"id" => id}, socket) do
    canvas = Studio.get_canvas!(id)
    {:ok, _} = Studio.delete_canvas(canvas)

    {:noreply, stream_delete(socket, :canvases, canvas)}
  end
end
