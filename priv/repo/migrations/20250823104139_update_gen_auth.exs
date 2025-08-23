defmodule Udraw.Repo.Migrations.UpdateGenAuth do
  use Ecto.Migration

  def change do
    alter table(:users_tokens) do
      add :authenticated_at, :utc_datetime
    end

    alter table(:users) do
      # Remove the null constraint from the former gen auth for magic emails
      modify :hashed_password, :string, null: true, from: {:string, null: false}
    end
  end
end
