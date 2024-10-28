defmodule Udraw.Repo do
  use Ecto.Repo,
    otp_app: :udraw,
    adapter: Ecto.Adapters.Postgres
end
