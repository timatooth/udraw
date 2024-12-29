defmodule DrawApp.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      DrawAppWeb.Telemetry,
      {DNSCluster, query: Application.get_env(:draw_app, :dns_cluster_query) || :ignore},
      {Phoenix.PubSub, name: DrawApp.PubSub},
      # Start a worker by calling: DrawApp.Worker.start_link(arg)
      # {DrawApp.Worker, arg},
      DrawApp.DrawingState,
      # Start to serve requests, typically the last entry
      DrawAppWeb.Endpoint
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: DrawApp.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    DrawAppWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
