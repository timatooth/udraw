defmodule Udraw.Studio.Canvas do
  use Ecto.Schema
  import Ecto.Changeset

  schema "canvases" do
    field :name, :string

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(canvas, attrs) do
    canvas
    |> cast(attrs, [:name])
    |> validate_required([:name])
  end
end
