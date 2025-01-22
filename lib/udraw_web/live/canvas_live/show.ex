defmodule UdrawWeb.CanvasLive.Show do
  use UdrawWeb, :live_view

  alias Udraw.Studio

  @impl true
  def mount(_params, _session, socket) do
    {:ok, socket}
  end

  @impl true
  def handle_params(%{"id" => id}, _, socket) do
    {:noreply,
     socket
     |> assign(:page_title, page_title(socket.assigns.live_action))
     |> assign(:canvas, Studio.get_canvas!(id))}
  end

  defp page_title(:show), do: "Show Canvas"
  defp page_title(:edit), do: "Edit Canvas"
end
