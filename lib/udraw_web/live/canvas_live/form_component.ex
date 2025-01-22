defmodule UdrawWeb.CanvasLive.FormComponent do
  use UdrawWeb, :live_component

  alias Udraw.Studio

  @impl true
  def render(assigns) do
    ~H"""
    <div>
      <.header>
        {@title}
        <:subtitle>Use this form to manage canvas records in your database.</:subtitle>
      </.header>

      <.simple_form
        for={@form}
        id="canvas-form"
        phx-target={@myself}
        phx-change="validate"
        phx-submit="save"
      >
        <.input field={@form[:name]} type="text" label="Name" />
        <:actions>
          <.button phx-disable-with="Saving...">Save Canvas</.button>
        </:actions>
      </.simple_form>
    </div>
    """
  end

  @impl true
  def update(%{canvas: canvas} = assigns, socket) do
    {:ok,
     socket
     |> assign(assigns)
     |> assign_new(:form, fn ->
       to_form(Studio.change_canvas(canvas))
     end)}
  end

  @impl true
  def handle_event("validate", %{"canvas" => canvas_params}, socket) do
    changeset = Studio.change_canvas(socket.assigns.canvas, canvas_params)
    {:noreply, assign(socket, form: to_form(changeset, action: :validate))}
  end

  def handle_event("save", %{"canvas" => canvas_params}, socket) do
    save_canvas(socket, socket.assigns.action, canvas_params)
  end

  defp save_canvas(socket, :edit, canvas_params) do
    case Studio.update_canvas(socket.assigns.canvas, canvas_params) do
      {:ok, canvas} ->
        notify_parent({:saved, canvas})

        {:noreply,
         socket
         |> put_flash(:info, "Canvas updated successfully")
         |> push_patch(to: socket.assigns.patch)}

      {:error, %Ecto.Changeset{} = changeset} ->
        {:noreply, assign(socket, form: to_form(changeset))}
    end
  end

  defp save_canvas(socket, :new, canvas_params) do
    case Studio.create_canvas(canvas_params) do
      {:ok, canvas} ->
        notify_parent({:saved, canvas})

        {:noreply,
         socket
         |> put_flash(:info, "Canvas created successfully")
         |> push_patch(to: socket.assigns.patch)}

      {:error, %Ecto.Changeset{} = changeset} ->
        {:noreply, assign(socket, form: to_form(changeset))}
    end
  end

  defp notify_parent(msg), do: send(self(), {__MODULE__, msg})
end
