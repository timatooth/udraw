defmodule Udraw.Repo.Migrations.CreateCanvases do
  use Ecto.Migration

  def change do
    create table(:canvases) do
      add :name, :string

      timestamps(type: :utc_datetime)
    end
  end
end
