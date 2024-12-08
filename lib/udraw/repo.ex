defmodule Udraw.Repo do
  use Ecto.Repo,
    otp_app: :udraw,
    adapter:
      if(Mix.env() in [:test],
        do: Ecto.Adapters.SQLite3,
        else: Ecto.Adapters.Postgres
      )
end
