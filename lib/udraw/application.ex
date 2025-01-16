defmodule Udraw.Application do
  # See https://hexdocs.pm/elixir/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      UdrawWeb.Telemetry,
      Udraw.Repo,
      {DNSCluster, query: Application.get_env(:udraw, :dns_cluster_query) || :ignore},
      {Phoenix.PubSub, name: Udraw.PubSub},
      # Start the Finch HTTP client for sending emails
      {Finch, name: Udraw.Finch},
      # Start a worker by calling: Udraw.Worker.start_link(arg)
      # {Udraw.Worker, arg},
      Udraw.DrawingServer,
      # Start to serve requests, typically the last entry
      UdrawWeb.Endpoint
    ]

    # See https://hexdocs.pm/elixir/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: Udraw.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    UdrawWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
